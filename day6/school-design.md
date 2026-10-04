# School Database Design

## Tables

- **`students`** stores one row for each student. Each student has a unique ID, a required name, and a unique email address.
- **`courses`** stores one row for each course. Each course has a unique ID, a required name, and a teacher.
- **`enrolments`** records which students take which courses. It also stores the student's grade for that course.

## Relationships

- A student can have many enrolments, so `students` to `enrolments` is a one-to-many relationship.
- A course can have many enrolments, so `courses` to `enrolments` is also a one-to-many relationship.
- Students and courses have a many-to-many relationship because one student can take several courses and one course can contain several students. The `enrolments` join table is needed to represent this relationship and to store relationship-specific data such as the grade. Its composite primary key prevents the same student from enrolling on the same course twice.

## Index

I would add an index on `enrolments(course_id)` because queries that list all students on a course and count students per course use the course ID to find matching enrolment rows. The primary key already indexes `student_id, course_id` in that order, so a separate course-first index would make these lookups more efficient.

## SQL or NoSQL

I would choose SQL for this system because students, courses, and enrolments have clear relationships and require constraints such as unique emails, valid foreign keys, and no duplicate enrolments. SQL also makes the required joins, grouping, filtering, and grade updates straightforward. A NoSQL database could store the data, but maintaining these relationships and enforcing consistency would be more complicated.
