const express = require('express');
const jwt = require('jsonwebtoken');
const fs = require("fs");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());

let ADMINS = [];
let USERS = [];
let COURSES = [];

// Read data from file, or initialize to empty array if file does not exist
try {
  ADMINS = JSON.parse(fs.readFileSync('admins.json', 'utf8'));
  USERS = JSON.parse(fs.readFileSync('users.json', 'utf8'));
  COURSES = JSON.parse(fs.readFileSync('courses.json', 'utf8'));
} catch {
  ADMINS = [];
  USERS = [];
  COURSES = [];
}

const SECRET = 'my-secret-key';

const authenticateJwt = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    jwt.verify(token, SECRET, (err, user) => {
      if (err) {
        return res.sendStatus(403);
      }
      req.user = user;
      next();
    });
  } else {
    res.sendStatus(401);
  }
};

// Admin routes
app.post('/admin/signup', (req, res) => {
  const admin = req.body
  const existingAdmin = ADMINS.find(a => a.username === admin.username)
  if(existingAdmin){
    res.status(403).json({ message: 'Admin already exists' });
  }
  else{
    ADMINS.push(admin);
    fs.writeFileSync("admins.json", JSON.stringify(ADMINS));
    const token = jwt.sign({username : admin.username , role : 'admin'}, SECRET, {expiresIn : '1h'});
    res.status(201).json({ message: 'Admin created successfully' , token})
  }
});

app.post('/admin/login', (req, res) => {
  const { username, password } = req.headers;
  const admin = ADMINS.find(a => a.username === username && a.password === password );

  if (admin) {
    const token = jwt.sign({username : admin.username , role : 'admin'}, SECRET, {expiresIn : '1h'});
    res.json({ message: 'Logged in successfully', token });
  } else {
    res.status(403).json({ message: 'Invalid username or password' });
  }  
});

app.get("/admin/me", authenticateJwt, (req, res) => {
  res.json({
    username: req.user.username
  })
})

app.post('/admin/courses', authenticateJwt, (req, res) => {
    const course = req.body
    course.courseId = COURSES.length + 1; 
    COURSES.push(course)
    fs.writeFileSync("courses.json", JSON.stringify(COURSES));
    res.status(201).json({ message: 'Course created successfully', courseId: course.courseId })
});

app.put('/admin/courses/:courseId', authenticateJwt, (req, res) => {
  const courseId = parseInt(req.params.courseId);

  const courseIndex = COURSES.findIndex(c => c.courseId === courseId);

  if (courseIndex > -1) {
    const updatedCourse = { ...COURSES[courseIndex], ...req.body };
    COURSES[courseIndex] = updatedCourse;
    fs.writeFileSync("courses.json", JSON.stringify(COURSES));
    res.json({ message: 'Course updated successfully' });
  } else {
    res.status(404).json({ message: 'Course not found' });
  }
});

app.get('/admin/courses', authenticateJwt, (req, res) => {
   res.json({ courses: COURSES })
});

// User routes
app.post('/users/signup', (req, res) => {
  const user = req.body;
  const existingUser= USERS.find(u => u.username === user.username)
  if(existingUser){
    res.status(403).json({ message: 'User already exists' });
  }
  else{
    USERS.push(user);
    fs.writeFileSync("users.json", JSON.stringify(USERS));
    const token = jwt.sign({username : user.username , role : 'user'}, SECRET, {expiresIn : '1h'});
    res.status(201).json({ message: 'User created successfully' , token})
  }
});

app.post('/users/login', (req, res) => {
  const { username, password } = req.headers;
  const user = USERS.find(u => u.username === username && u.password === password);
  if (user) {
    const token = jwt.sign({ username , role : 'user'}, SECRET, {expiresIn : '1h'});
    res.json({ message: 'Logged in successfully', token });
  } else {
    res.status(403).json({ message: 'User authentication failed' });
  }
});

app.get('/users/courses', authenticateJwt, (req, res) => {
  const filteredCourses = COURSES.filter(c => c.published)
  res.json({ courses: filteredCourses });
});

app.post('/users/courses/:courseId', authenticateJwt, (req, res) => {
  const courseId = parseInt(req.params.courseId);
  const course = COURSES.find(c => c.courseId === courseId);
  if (course) {
    const user = USERS.find(u => u.username === req.user.username);
    if (user) {
      if (!user.purchasedCourses) {
        user.purchasedCourses = [];
      }
      user.purchasedCourses.push(course);
      fs.writeFileSync('users.json', JSON.stringify(USERS));
      res.json({ message: 'Course purchased successfully' });
    } else {
      res.status(403).json({ message: 'User not found' });
    }
  } else {
    res.status(404).json({ message: 'Course not found' });
  }
});

app.get('/users/purchasedCourses', authenticateJwt, (req, res) => {
  const user = USERS.find(u => u.username === req.user.username);
  if (user && user.purchasedCourses) {
    res.json({ purchasedCourses: user.purchasedCourses });
  } else {
    res.status(404).json({ message: 'No courses purchased' });
  }
});

app.listen(3000, () => {
  console.log('Server is listening on port 3000');
});
