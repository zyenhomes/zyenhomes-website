INSERT INTO booking_requests
(request_id,property_id,guest_name,guest_email,guest_phone,check_in,check_out,guests,quote_total_cents,guesty_quote_id)
VALUES
('request-local-a','149-tyrolean','Test Guest','test@example.invalid','+14165550101','2027-01-14','2027-01-18',6,105300,'6adb5d7320cb330ec34a3507'),
('request-local-noquote','149-tyrolean','Test Guest','test@example.invalid','+14165550101','2027-01-14','2027-01-18',6,105300,NULL);

INSERT INTO booking_requests (request_id,property_id,guest_name,guest_email,guest_phone,check_in,check_out,guests,quote_total_cents,guesty_quote_id) VALUES ('request-local-e2e','149-tyrolean','Test Guest','e2e@example.invalid','+14165550101','2027-01-14','2027-01-18',6,105300,'aaaaaaaaaaaaaaaaaaaaaaaa');

INSERT INTO booking_requests (request_id,property_id,guest_name,guest_email,guest_phone,check_in,check_out,guests,quote_total_cents,guesty_quote_id) VALUES ('race-quote-a','149-tyrolean','Test Guest','race-a@example.invalid','+14165550101','2027-01-14','2027-01-18',6,105300,'bbbbbbbbbbbbbbbbbbbbbbbb');
INSERT INTO booking_requests (request_id,property_id,guest_name,guest_email,guest_phone,check_in,check_out,guests,quote_total_cents,guesty_quote_id) VALUES ('race-quote-b','149-tyrolean','Test Guest','race-b@example.invalid','+14165550101','2027-01-14','2027-01-18',6,105300,'bbbbbbbbbbbbbbbbbbbbbbbb');
INSERT INTO booking_requests (request_id,property_id,guest_name,guest_email,guest_phone,check_in,check_out,guests,quote_total_cents,guesty_quote_id) VALUES ('race-identity-a','149-tyrolean','Test Guest','race-c@example.invalid','+14165550101','2027-01-14','2027-01-18',6,105300,'cccccccccccccccccccccccc');
INSERT INTO booking_requests (request_id,property_id,guest_name,guest_email,guest_phone,check_in,check_out,guests,quote_total_cents,guesty_quote_id) VALUES ('race-identity-b','149-tyrolean','Test Guest',' RACE-C@example.invalid','+14165550101','2027-01-14','2027-01-18',6,105300,'dddddddddddddddddddddddd');
INSERT INTO booking_requests (request_id,property_id,guest_name,guest_email,guest_phone,check_in,check_out,guests,quote_total_cents,guesty_quote_id) VALUES ('race-independent-a','149-tyrolean','Test Guest','race-d@example.invalid','+14165550101','2027-01-14','2027-01-18',6,105300,'eeeeeeeeeeeeeeeeeeeeeeee');
INSERT INTO booking_requests (request_id,property_id,guest_name,guest_email,guest_phone,check_in,check_out,guests,quote_total_cents,guesty_quote_id) VALUES ('race-independent-b','149-tyrolean','Test Guest','race-e@example.invalid','+14165550101','2027-01-14','2027-01-18',6,105300,'ffffffffffffffffffffffff');
