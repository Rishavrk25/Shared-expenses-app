# Shared Expense Management System

## Overview

A robust, full-stack expense sharing application designed to streamline the financial management of groups and shared events. The system provides a comprehensive suite of tools for tracking individual expenditures, maintaining membership histories, and automatically calculating the optimal paths for settling collective debts. Key capabilities include bulk data ingestion via CSV, anomaly detection, and automated reporting.

## Tech Stack

**Frontend Framework**
- React: Component-based user interface rendering
- Tailwind CSS: Utility-first framework for responsive styling
- Axios: Promise-based HTTP client for API communication

**Backend Infrastructure**
- Node.js: Asynchronous event-driven JavaScript runtime
- Express.js: Lightweight web application framework
- JWT Authentication: Secure, stateless user session management

**Database System**
- PostgreSQL (Neon): Fully managed, serverless relational database architecture

**Deployment Environments**
- Frontend: Hosted via Netlify / Vercel for global edge delivery
- Backend: Deployed on Render for scalable API hosting
- Database: Managed instances hosted on Neon

## Features

### Authentication and Security
- **User Registration**: Secure account creation with encrypted credential storage.
- **Session Login**: Credential verification and token issuance.
- **Protected Routing**: JWT-based middleware ensuring restricted access to authenticated user paths.

### Group Management Operations
- **Group Creation**: Establish dedicated environments for distinct expense tracking (e.g., trips, households).
- **Member Addition**: Invite and integrate new participants into existing groups.
- **Member Removal**: Manage group rosters and track historical memberships.

### Expense Tracking Mechanisms
- **Expense Logging**: Record individual transactions with detailed metadata.
- **Split Methodologies**: Distribute costs across participants using predefined logic (e.g., exact amounts, percentages, or equal shares).
- **Balance Calculation**: Real-time aggregation of individual debts and credits within a group.

### Settlement Optimization
- **Smart Recommendations**: Implementation of a greedy algorithm to calculate the absolute minimum number of transactions required for all group members to settle their debts.

### CSV Data Processing
- **File Upload**: Support for parsing bulk financial records uploaded via `.csv` files.
- **Data Parsing**: Systematic extraction and structuring of raw CSV strings into actionable database objects.
- **Anomaly Detection**: Automated validation checks to identify and flag malformed, inconsistent, or anomalous data entries.
- **Report Generation**: Detailed summaries outlining the results of the import process, including successful ingestions and flagged errors.

## Installation Instructions

### Backend Configuration

Navigate to the backend directory, install the required node modules, and initialize the development server:

```bash
cd backend
npm install
npm run dev
```

### Frontend Configuration

Navigate to the frontend directory, install the necessary dependencies, and start the local development environment:

```bash
cd frontend
npm install
npm run dev
```

## Deployment Links

- **Frontend Application**: https://shared-expenses-app-frontend.onrender.com
- **Backend API**: https://shared-expenses-app-backend.onrender.com

## Author

Rishav Kumar
