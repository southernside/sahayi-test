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
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    logger.warn('GOOGLE_MAPS_API_KEY not set, skipping geocoding');
    return { formatted_address: `${lat.toFixed(6)}, ${lng.toFixed(6)}` };
  }

  const url = `https://maps.googleapis.com/maps/api/geocode/json`;
  const response = await axios.get(url, {
    params: {
      latlng: `${lat},${lng}`,
      key: apiKey,
      language: 'en',
      region: 'in',
    },
    timeout: 5000,
  });

  if (response.data.status !== 'OK' || !response.data.results?.length) {
    logger.warn('Geocoding returned no results', { lat, lng, status: response.data.status });
    return { formatted_address: `${lat.toFixed(6)}, ${lng.toFixed(6)}` };
  }

  const result = response.data.results[0];
  const formatted_address = result.formatted_address;

  // Extract district and state from address components
  let district: string | undefined;
  let state: string | undefined;

  for (const component of result.address_components) {
    if (component.types.includes('administrative_area_level_2')) {
      district = component.long_name;
    }
    if (component.types.includes('administrative_area_level_1')) {
      state = component.long_name;
    }
  }

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
