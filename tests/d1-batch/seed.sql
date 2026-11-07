INSERT INTO booking_requests
(request_id,property_id,guest_name,guest_email,guest_phone,check_in,check_out,guests,quote_total_cents,guesty_quote_id)
VALUES
('request-local-a','149-tyrolean','Test Guest','test@example.invalid','+14165550101','2027-01-14','2027-01-18',6,105300,'6adb5d7320cb330ec34a3507'),
('request-local-noquote','149-tyrolean','Test Guest','test@example.invalid','+14165550101','2027-01-14','2027-01-18',6,105300,NULL);
