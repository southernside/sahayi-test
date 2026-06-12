import axios from 'axios';
import { logger } from '../utils/logger';
import { supabase } from '../lib/supabase';

interface GeoResult {
  formatted_address: string;
  panchayat_id?: string;
  district?: string;
  state?: string;
}

export async function geocodeLocation(lat: number, lng: number): Promise<GeoResult> {
  const url = `https://nominatim.openstreetmap.org/reverse`;
  let result;
  
  try {
    const response = await axios.get(url, {
      params: {
        lat,
        lon: lng,
        format: 'jsonv2',
        zoom: 18,
        addressdetails: 1,
      },
      headers: {
        'User-Agent': 'Sahayi Civic Platform (sahayi.citizen.test@example.com)'
      },
      timeout: 5000,
    });

    if (!response.data || response.data.error) {
      logger.warn('Geocoding returned no results or error', { lat, lng, error: response.data?.error });
      return { formatted_address: `${lat.toFixed(6)}, ${lng.toFixed(6)}` };
    }

    result = response.data;
  } catch (error) {
    logger.error('Geocoding API request failed', { lat, lng, error });
    return { formatted_address: `${lat.toFixed(6)}, ${lng.toFixed(6)}` };
  }

  const formatted_address = result.display_name;

  // Extract district and state from address components
  let district: string | undefined = result.address?.state_district || result.address?.county;
  let state: string | undefined = result.address?.state;

  // Try to find matching panchayat by district name using PostGIS
  let panchayat_id: string | undefined;
  if (district) {
    const { data: panchayat } = await supabase
      .from('panchayats')
      .select('id')
      .ilike('district', `%${district}%`)
      .limit(1)
      .single();
    panchayat_id = panchayat?.id;
  }

  return { formatted_address, panchayat_id, district, state };
}
