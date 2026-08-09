-- Rate limiting for the endpoints anyone on the internet can reach: the
-- newsletter sign-up and the contact form. Both send mail, so without a limit
-- they are an open relay pointed at the author's own mailbox.
--
-- auth_attempts already does this job for the login form, but it is keyed to
-- an account identifier and carries login semantics. Keeping the public
-- buckets separate means a flood of contact-form spam can never lock anyone
-- out of the back office.

CREATE TABLE IF NOT EXISTS rate_limits (
  id     BIGINT AUTO_INCREMENT PRIMARY KEY,
  bucket VARCHAR(255) NOT NULL,
  hit_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX rate_limits_bucket_idx (bucket, hit_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
