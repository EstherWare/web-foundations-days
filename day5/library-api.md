# Library Books API

The API uses JSON and exposes the collection at `/api/books`.

## Endpoints

- **List books**
  - **Method:** `GET`
  - **Path:** `/api/books`
  - **Description:** Returns all books in the library.
  - **Success:** `200 OK`

- **Get one book**
  - **Method:** `GET`
  - **Path:** `/api/books/{id}`
  - **Description:** Returns the book with the requested ID.
  - **Success:** `200 OK`

- **Create a book**
  - **Method:** `POST`
  - **Path:** `/api/books`
  - **Description:** Adds a new book to the library.
  - **Example request body:**
    ```json
    {
      "title": "The Left Hand of Darkness",
      "author": "Ursula K. Le Guin",
      "publishedYear": 1969
    }
    ```
  - **Success:** `201 Created`

- **Update a book**
  - **Method:** `PUT`
  - **Path:** `/api/books/{id}`
  - **Description:** Replaces the book with the requested ID.
  - **Example request body:**
    ```json
    {
      "title": "The Left Hand of Darkness",
      "author": "Ursula K. Le Guin",
      "publishedYear": 1969
    }
    ```
  - **Success:** `200 OK`

- **Delete a book**
  - **Method:** `DELETE`
  - **Path:** `/api/books/{id}`
  - **Description:** Removes the book with the requested ID.
  - **Success:** `204 No Content`

- **List books by an author**
  - **Method:** `GET`
  - **Path:** `/api/books?author=Ursula%20K.%20Le%20Guin`
  - **Description:** Returns books whose author matches the `author` query parameter.
  - **Success:** `200 OK`

## Error codes

- **`400 Bad Request`:** The request is invalid, such as creating a book without a required `title` or `author`.
- **`404 Not Found`:** The requested book ID does not exist, such as `GET /api/books/9999`.
