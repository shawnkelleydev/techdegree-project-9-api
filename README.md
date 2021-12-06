# techdegree-project-9-api

This is my express api project for Team Treehouse.  It receives json data and interracts with databases using Sequelize ORM.

To test the project:

1. Run npm start in the command line.

2. Use Postman to submit request to the following routes:

  POST /api/users        creates a new user if provided the following:
  
    {
      "firstName": "foo", (required)
      "lastName": "bar", (required)
      "emailAddress": "foo@bar.com", (required)
      "password": "foobar" (required, hashed before commited to database)
     }
     
  GET /api/users         returns information for current authenticated user.

  GET /api/courses       returns list of courses with owner data.
  
  GET /api/courses/:id   returns data for specific course.
  
  POST /api/courses      adds courses for an authenticated user with the following format:
  
    {
      "title": "foo", (required)
      "description": "bar", (required)
      "estimatedTime": "foo time",
      "materialsNeeded": "bar materials",
    }
    
  PUT /api/courses/:id   updates existing course owned by the authenticated user
  
  DELETE /api/courses/:id  deletes course from database if owned by authenticated user
  
