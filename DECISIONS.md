# Engineering Decisions

## PostgreSQL

Chosen because the application contains strongly related entities and benefits from foreign-key constraints.

## JWT Authentication

Used for stateless authentication and easy deployment.

## membership_history Table

Created to support users joining and leaving groups while preserving historical accuracy.

## import_jobs Table

Created to track every CSV upload independently.

## import_anomalies Table

Used to store anomaly reports and actions taken.
