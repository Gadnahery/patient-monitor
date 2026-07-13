export type Thresholds = {
  hr_min: number;
  hr_max: number;
  spo2_min: number;
  temp_min: number;
  temp_max: number;
};

export type Patient = {
  id: string;
  mrn: string | null;
  full_name: string;
  date_of_birth: string | null;
  room: string | null;
  bed: string | null;
  phone: string | null;
  sex: "male" | "female" | "other" | null;
  diagnosis: string | null;
  status: "active" | "discharged";
  thresholds: Thresholds;
  admitted_at: string;
  created_at: string;
};

export type Device = {
  id: string;
  name: string;
  device_key: string;
  patient_id: string | null;
  last_seen_at: string | null;
  created_at: string;
};

export type VitalsReading = {
  id: number;
  device_id: string | null;
  patient_id: string | null;
  heart_rate: number | null;
  spo2: number | null;
  temperature: number | null;
  signal_quality: "ok" | "weak" | "no_contact";
  recorded_at: string;
};

export type AlertType =
  | "hr_high"
  | "hr_low"
  | "spo2_low"
  | "temp_high"
  | "temp_low"
  | "sensor_error";

export type Alert = {
  id: number;
  patient_id: string | null;
  device_id: string | null;
  reading_id: number | null;
  type: AlertType;
  severity: "warning" | "critical";
  message: string;
  value: number | null;
  acknowledged: boolean;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  created_at: string;
};

export type Profile = {
  id: string;
  full_name: string;
  role: "clinician" | "admin";
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      patients: {
        Row: Patient;
        Insert: Partial<Patient>;
        Update: Partial<Patient>;
        Relationships: [];
      };
      devices: {
        Row: Device;
        Insert: Partial<Device>;
        Update: Partial<Device>;
        Relationships: [];
      };
      vitals_readings: {
        Row: VitalsReading;
        Insert: Partial<VitalsReading>;
        Update: Partial<VitalsReading>;
        Relationships: [];
      };
      alerts: {
        Row: Alert;
        Insert: Partial<Alert>;
        Update: Partial<Alert>;
        Relationships: [];
      };
      profiles: {
        Row: Profile;
        Insert: Partial<Profile>;
        Update: Partial<Profile>;
        Relationships: [];
      };
    };
    Views: {
      latest_vitals: { Row: VitalsReading; Relationships: [] };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
