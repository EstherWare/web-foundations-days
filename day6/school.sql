PRAGMA foreign_keys = ON;

CREATE TABLE students (
  student_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE
);

CREATE TABLE courses (
  course_id INTEGER PRIMARY KEY,
  course_name TEXT NOT NULL,
  teacher TEXT NOT NULL
);

CREATE TABLE enrolments (
  student_id INTEGER NOT NULL,
  course_id INTEGER NOT NULL,
  grade TEXT,
  PRIMARY KEY (student_id, course_id),
  FOREIGN KEY (student_id) REFERENCES students(student_id),
  FOREIGN KEY (course_id) REFERENCES courses(course_id)
);

INSERT INTO students (student_id, name, email) VALUES
  (1, 'Alice Johnson', 'alice.johnson@example.com'),
  (2, 'Brian Smith', 'brian.smith@example.com'),
  (3, 'Chloe Davis', 'chloe.davis@example.com');

INSERT INTO courses (course_id, course_name, teacher) VALUES
  (1, 'Mathematics', 'Mr. Patel'),
  (2, 'Computer Science', 'Ms. Garcia'),
  (3, 'History', 'Dr. Wilson');

INSERT INTO enrolments (student_id, course_id, grade) VALUES
  (1, 1, 'A'),
  (1, 2, 'B+'),
  (2, 1, 'B'),
  (2, 3, 'A-'),
  (3, 2, 'A');

-- All courses for one student, selected by the student's name.
SELECT c.course_name, e.grade
FROM courses AS c
JOIN enrolments AS e ON e.course_id = c.course_id
JOIN students AS s ON s.student_id = e.student_id
WHERE s.name = 'Alice Johnson'
ORDER BY c.course_name;

-- All students enrolled on one course.
SELECT s.name, s.email, e.grade
FROM students AS s
JOIN enrolments AS e ON e.student_id = s.student_id
JOIN courses AS c ON c.course_id = e.course_id
WHERE c.course_name = 'Mathematics'
ORDER BY s.name;

-- Number of students enrolled on each course, including courses with none.
SELECT c.course_name, COUNT(e.student_id) AS student_count
FROM courses AS c
LEFT JOIN enrolments AS e ON e.course_id = c.course_id
GROUP BY c.course_id, c.course_name
ORDER BY c.course_name;

-- Students who have no enrolments.
SELECT s.student_id, s.name, s.email
FROM students AS s
LEFT JOIN enrolments AS e ON e.student_id = s.student_id
WHERE e.student_id IS NULL
ORDER BY s.name;

-- Update one enrolment's grade.
UPDATE enrolments
SET grade = 'A-'
WHERE student_id = 2
  AND course_id = 1;
