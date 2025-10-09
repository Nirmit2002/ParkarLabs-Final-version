# ParkarLabs ER Diagram (Draft)

Entities:
- Users
- Teams
- Roles
- Permissions
- Courses
- Modules
- Tasks
- Assignments
- Templates
- DependencySets
- Containers
- AuditLogs
- Metrics
- ImportJobs
- Snapshots

Relationships:
- Users <-> Teams (many-to-many via user_teams)
- Users <-> Roles (1-to-many)
- Courses -> Modules (1-to-many)
- Assignments link Users <-> Tasks/Courses
- Containers linked to Users + Templates
- DependencySets link to Templates
