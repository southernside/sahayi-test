import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware } from '../middleware/auth';
import { uploadMiddleware } from '../middleware/upload';
import { supabase } from '../lib/supabase';
import { geocodeLocation } from '../services/geocodingService';
import { sendNotification } from '../services/notificationService';
import { generateComplaintNumber } from '../utils/complaintNumber';
import { logStatusTransition, logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';
import {
  CreateComplaintSchema,
  ComplaintFilterSchema,
  SubmitFeedbackSchema,
  UpdateComplaintStatusSchema,
} from '@sahayi/schemas';
import type { ComplaintStatus } from '@sahayi/types';

export const complaintsRouter = Router();

// All routes require auth
complaintsRouter.use(authMiddleware);

// ─── List Complaints ──────────────────────────────────────────────────────────

complaintsRouter.get('/', async (req, res, next) => {
  try {
    const user = req.user!;
    const filters = ComplaintFilterSchema.parse(req.query);
    const offset = (filters.page - 1) * filters.limit;

    let query = supabase
      .from('complaints')
      .select(`
        *,
        panchayat:panchayats(id, name, district, state),
        evidence_files(id, storage_url, signed_url, file_type, file_name, created_at),
        feedback(id, rating, created_at)
      `, { count: 'exact' })
      .eq('citizen_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + filters.limit - 1);

    if (filters.status) query = query.eq('status', filters.status);
    if (filters.category) query = query.eq('category', filters.category);
    if (filters.search) {
      query = query.or(
        `complaint_number.ilike.%${filters.search}%,description.ilike.%${filters.search}%`,
      );
    }

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({
      success: true,
      data: data || [],
      meta: {
        page: filters.page,
        limit: filters.limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / filters.limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

// ─── Get Single Complaint ─────────────────────────────────────────────────────

complaintsRouter.get('/:id', async (req, res, next) => {
  try {
    const user = req.user!;
    const { id } = req.params;

    const { data, error } = await supabase
      .from('complaints')
      .select(`
        *,
        panchayat:panchayats(id, name, district, state),
        evidence_files(id, storage_url, signed_url, file_type, file_name, uploader_role, created_at),
        status_logs(id, from_status, to_status, notes, created_at, changed_by:users(id, name, role)),
        feedback(id, rating, comment, created_at)
      `)
      .eq('id', id)
      .eq('citizen_id', user.id)
      .single();

    if (error || !data) {
      throw new AppError('Complaint not found', 404);
    }

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// ─── Create / Draft Complaint ─────────────────────────────────────────────────

complaintsRouter.post('/', async (req, res, next) => {
  try {
    const user = req.user!;
    const input = CreateComplaintSchema.parse(req.body);
    const isDraft = req.body.is_draft === true;

    // Reverse geocode for human-readable address
    let address = input.address;
    let panchayatId = input.panchayat_id;

    if (!isDraft) {
      try {
        const geoResult = await geocodeLocation(input.latitude, input.longitude);
        address = address || geoResult.formatted_address;
        panchayatId = panchayatId || geoResult.panchayat_id;
      } catch (geoError) {
        logger.warn('Geocoding failed, proceeding without address', { error: geoError });
      }
    }

    const complaint_number = isDraft ? null : generateComplaintNumber();
    const status = isDraft ? 'DRAFT' : 'SUBMITTED';

    const { data, error } = await supabase
      .from('complaints')
      .insert({
        citizen_id: user.id,
        category: input.category,
        description: input.description,
        latitude: input.latitude,
        longitude: input.longitude,
        address,
        panchayat_id: panchayatId,
        status,
        complaint_number,
      })
      .select(`
        *,
        panchayat:panchayats(id, name, district, state)
      `)
      .single();

    if (error) throw error;

    // Log initial status
    if (!isDraft) {
      await supabase.from('status_logs').insert({
        complaint_id: data.id,
        from_status: null,
        to_status: 'SUBMITTED',
        changed_by_id: user.id,
        notes: 'Complaint submitted by citizen',
      });

      logStatusTransition({
        complaintId: data.id,
        fromStatus: null,
        toStatus: 'SUBMITTED',
        changedById: user.id,
      });

      // Send confirmation notification
      if (user.fcm_token) {
        await sendNotification({
          token: user.fcm_token,
          title: 'Complaint Received',
          body: `Your complaint ${data.complaint_number} has been submitted successfully.`,
          data: { complaint_id: data.id, type: 'COMPLAINT_SUBMITTED' },
        });
      }

      // Store notification record
      await supabase.from('notifications').insert({
        complaint_id: data.id,
        recipient_id: user.id,
        type: 'COMPLAINT_SUBMITTED',
        title: 'Complaint Received',
        message: `Your complaint ${data.complaint_number} has been submitted successfully.`,
        read: false,
      });
    }

    logger.info('Complaint created', {
      complaint_id: data.id,
      citizen_id: user.id,
      status,
      category: data.category,
    });

    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// ─── Submit Draft ─────────────────────────────────────────────────────────────

complaintsRouter.post('/:id/submit', async (req, res, next) => {
  try {
    const user = req.user!;
    const { id } = req.params;

    const { data: existing, error: fetchError } = await supabase
      .from('complaints')
      .select('*')
      .eq('id', id)
      .eq('citizen_id', user.id)
      .eq('status', 'DRAFT')
      .single();

    if (fetchError || !existing) {
      throw new AppError('Draft complaint not found', 404);
    }

    const complaint_number = generateComplaintNumber();

    const { data, error } = await supabase
      .from('complaints')
      .update({
        status: 'SUBMITTED',
        complaint_number,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await supabase.from('status_logs').insert({
      complaint_id: id,
      from_status: 'DRAFT',
      to_status: 'SUBMITTED',
      changed_by_id: user.id,
    });

    logStatusTransition({
      complaintId: id,
      fromStatus: 'DRAFT',
      toStatus: 'SUBMITTED',
      changedById: user.id,
    });

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// ─── Upload Evidence ──────────────────────────────────────────────────────────

complaintsRouter.post(
  '/:id/evidence',
  uploadMiddleware.array('files', 5),
  async (req, res, next) => {
    try {
      const user = req.user!;
      const { id } = req.params;
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        throw new AppError('No files uploaded', 400);
      }

      // Verify complaint belongs to user
      const { data: complaint, error: fetchError } = await supabase
        .from('complaints')
        .select('id, status')
        .eq('id', id)
        .eq('citizen_id', user.id)
        .single();

      if (fetchError || !complaint) {
        throw new AppError('Complaint not found', 404);
      }

      const allowedStatuses: ComplaintStatus[] = [
        'DRAFT', 'SUBMITTED', 'PENDING', 'MORE_INFO_REQUIRED',
      ];
      if (!allowedStatuses.includes(complaint.status as ComplaintStatus)) {
        throw new AppError('Cannot add evidence to a complaint in its current status', 400);
      }

      const uploadedFiles = [];

      for (const file of files) {
        const ext = file.originalname.split('.').pop();
        const storagePath = `complaints/${id}/${uuidv4()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('complaint-evidence')
          .upload(storagePath, file.buffer, {
            contentType: file.mimetype,
            upsert: false,
          });

        if (uploadError) {
          logger.error('File upload to storage failed', { error: uploadError });
          throw new AppError('Failed to upload file', 500);
        }

        const { data: urlData } = await supabase.storage
          .from('complaint-evidence')
          .createSignedUrl(storagePath, 60 * 60); // 1 hour

        const { data: fileRecord, error: dbError } = await supabase
          .from('evidence_files')
          .insert({
            complaint_id: id,
            uploader_id: user.id,
            uploader_role: user.role,
            storage_url: storagePath,
            signed_url: urlData?.signedUrl,
            file_type: file.mimetype,
            file_name: file.originalname,
            file_size: file.size,
          })
          .select()
          .single();

        if (dbError) throw dbError;
        uploadedFiles.push(fileRecord);
      }

      // If MORE_INFO_REQUIRED, move back to PENDING after new evidence
      if (complaint.status === 'MORE_INFO_REQUIRED') {
        await supabase
          .from('complaints')
          .update({ status: 'PENDING', updated_at: new Date().toISOString() })
          .eq('id', id);

        await supabase.from('status_logs').insert({
          complaint_id: id,
          from_status: 'MORE_INFO_REQUIRED',
          to_status: 'PENDING',
          changed_by_id: user.id,
          notes: 'Citizen uploaded additional evidence',
        });
      }

      res.status(201).json({ success: true, data: uploadedFiles });
    } catch (error) {
      next(error);
    }
  },
);

// ─── Reopen Complaint ─────────────────────────────────────────────────────────

complaintsRouter.post('/:id/reopen', async (req, res, next) => {
  try {
    const user = req.user!;
    const { id } = req.params;
    const { reason } = req.body;

    const { data: complaint, error: fetchError } = await supabase
      .from('complaints')
      .select('id, status, complaint_number')
      .eq('id', id)
      .eq('citizen_id', user.id)
      .single();

    if (fetchError || !complaint) {
      throw new AppError('Complaint not found', 404);
    }

    if (complaint.status !== 'RESOLVED') {
      throw new AppError('Only resolved complaints can be reopened', 400);
    }

    const { data, error } = await supabase
      .from('complaints')
      .update({ status: 'REOPENED', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await supabase.from('status_logs').insert({
      complaint_id: id,
      from_status: 'RESOLVED',
      to_status: 'REOPENED',
      changed_by_id: user.id,
      notes: reason || 'Citizen is not satisfied with the resolution',
    });

    logStatusTransition({
      complaintId: id,
      fromStatus: 'RESOLVED',
      toStatus: 'REOPENED',
      changedById: user.id,
    });

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// ─── Submit Feedback ──────────────────────────────────────────────────────────

complaintsRouter.post('/:id/feedback', async (req, res, next) => {
  try {
    const user = req.user!;
    const { id } = req.params;
    const input = SubmitFeedbackSchema.parse(req.body);

    const { data: complaint, error: fetchError } = await supabase
      .from('complaints')
      .select('id, status')
      .eq('id', id)
      .eq('citizen_id', user.id)
      .single();

    if (fetchError || !complaint) {
      throw new AppError('Complaint not found', 404);
    }

    if (complaint.status !== 'RESOLVED') {
      throw new AppError('Feedback can only be submitted for resolved complaints', 400);
    }

    // Check if feedback already exists
    const { data: existingFeedback } = await supabase
      .from('feedback')
      .select('id')
      .eq('complaint_id', id)
      .single();

    if (existingFeedback) {
      throw new AppError('Feedback already submitted for this complaint', 400);
    }

    const { data: feedback, error: fbError } = await supabase
      .from('feedback')
      .insert({
        complaint_id: id,
        citizen_id: user.id,
        rating: input.rating,
        comment: input.comment,
      })
      .select()
      .single();

    if (fbError) throw fbError;

    // Move to CLOSED
    await supabase
      .from('complaints')
      .update({ status: 'CLOSED', updated_at: new Date().toISOString() })
      .eq('id', id);

    await supabase.from('status_logs').insert({
      complaint_id: id,
      from_status: 'RESOLVED',
      to_status: 'CLOSED',
      changed_by_id: user.id,
      notes: `Citizen submitted feedback (rating: ${input.rating}/5)`,
    });

    logStatusTransition({
      complaintId: id,
      fromStatus: 'RESOLVED',
      toStatus: 'CLOSED',
      changedById: user.id,
    });

    res.status(201).json({ success: true, data: feedback });
  } catch (error) {
    next(error);
  }
});

// ─── Delete Draft ─────────────────────────────────────────────────────────────

complaintsRouter.delete('/:id', async (req, res, next) => {
  try {
    const user = req.user!;
    const { id } = req.params;

    const { error } = await supabase
      .from('complaints')
      .delete()
      .eq('id', id)
      .eq('citizen_id', user.id)
      .eq('status', 'DRAFT');

    if (error) throw error;

    res.json({ success: true, data: { message: 'Draft deleted' } });
  } catch (error) {
    next(error);
  }
});
