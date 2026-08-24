INSERT INTO system_settings (setting_key, setting_value, description)
VALUES (
  'payment.application_fee',
  '{"amount":260000}'::jsonb,
  'Phí nộp hồ sơ toàn hệ thống (VND).'
)
ON CONFLICT (setting_key) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM system_settings
    WHERE setting_key = 'payment.application_fee'
      AND jsonb_typeof(setting_value) = 'object'
      AND jsonb_typeof(setting_value->'amount') = 'number'
      AND setting_value->>'amount' ~ '^[0-9]+$'
      AND (setting_value->>'amount')::numeric BETWEEN 1 AND 999999999999
  ) THEN
    RAISE EXCEPTION 'payment.application_fee must contain a positive integer VND amount';
  END IF;
END $$;
