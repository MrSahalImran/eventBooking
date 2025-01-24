# PRD of Event Management API
## Objective
To develop robust solution for creating,, and participating in events using the Gin framework GoLang. The solution provides features as CRUD operations for events, user authentication and event registration, all secured via JWT-based authentication. Only authorized users can sensitive actions, with access controls ensuring data integrity. Designed for flexibility, it emphasizes usability, scalability, and security, making it ideal for event-driven platforms.

## Scope

- Event Management
- User Management
- Event Participation

## Features

- **GET /events**: Retrieve a list of all available events.
- **GET /events/<id>**: Fetch details of a specific event.
- **POST /events**: Create a new event (authentication required).
- **PUT /events/<id>**: Update event details (authentication required, accessible only by the creator).
- **DELETE /events/<id>**: Remove an event (authentication required, accessible only by the creator).
- **POST /signup**: Register a new user account.
- **POST /login**: Authenticate users and issue JWT tokens for secure access.
- **POST /events/<id>/register**: Allow users to register for a specific event (authentication required).
- **DELETE /events/<id>/register**: Cancel a user's event registration (authentication required).
- **Authentication**: Enforced using JSON Web Tokens (JWT).
- **Access Restrictions**: Ensure only event creators can modify or delete their events.
- **Secure Endpoints**: Users must present valid JWT tokens to access protected routes.

## Use Cases

#### Event Organizers
- **Create Events**: Organizers can create new events.
- **Manage Events**: Organizers can update or delete their events.
- **View Registrations**: Organizers can see who has registered for their events.

#### Event Participants
- **Browse Events**: Students can view available events.
- **Register for Events**: Students can register for events.
- **Manage Registrations**: Students can cancel their registrations.

#### User Management
- **Sign Up**: New students can create accounts.
- **Log In**: Students can log in securely.
- **Update Profile**: Students can update their profile information.

#### Security and Access Control
- **JWT Authentication**: Secure endpoints with JWT tokens.\
- **Access Restrictions**: Only event creators can modify or delete their events.

#### Administrative Use Cases
- **Monitor Activity**: Administrators can oversee platform activity.
- **Manage Users**: Administrators can manage user accounts.

## Technical Requirements
 - Frontend for the api
 - Hosting platform(Linux)
 - Go
 - Mysql
 - Gin Framework

## Timeline

#### Phase 1: Planning and Design (1-2 weeks)
- Define project scope and requirements.
- Create detailed design documents and API specifications.
- Set up project repository and initial project structure.

#### Phase 2: Development (4-6 weeks)
- **Week 1-2**: Implement user authentication and JWT-based security.
- **Week 3-4**: Develop event management endpoints (CRUD operations).
- **Week 5-6**: Implement event registration and participation features.

#### Phase 3: Testing (2-3 weeks)
- Write unit tests and integration tests for all endpoints.
- Perform thorough testing to identify and fix bugs.
- Conduct security testing to ensure data integrity and protection.



