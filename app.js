const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const moment = require("moment");
const nodemailer = require("nodemailer");
const randomize = require("randomatic");

const JWT_SECRET = "dtbv";

const app = express();
const port = 3000;
const isProduct = true;
const emailConfig = "dautubenvung36LK@hotmail.com";
const passwordConfig = "dautubenvung36";

// Middlewares
app.use(cors());
app.use(bodyParser.json());

// MySQL connection
const pool = mysql.createPool({
  host: "localhost",
  user: isProduct ? "admin" : "root",
  password: "tmkITC98*",
  database: "course",
});

// Ensure connection works
pool.getConnection((err, connection) => {
  if (err) throw err;
  console.log("Connected as ID " + connection.threadId);
  connection.release();
});

//hello world
app.get("/", (req, res) => {
  res.send("Hello World");
});

const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  console.log("req.headers: ", req.headers);
  console.log("token: ", token);
  if (!token) next();
  if (token === "null" || token === null) next();

  if (token !== null && token !== "null") {
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) return res.status(401).send("Invalid Token");

      // Check if the token is in the active tokens table and not expired
      pool.query(
        "SELECT * FROM ActiveTokens WHERE token = ? AND expires_at > NOW()",
        [token],
        (err, results) => {
          if (err || results.length === 0) {
            return res
              .status(401)
              .send("Token expired or logged out from other devices");
          }
          req.user_id = decoded.user_id; // Store user id in request for further use
          next();
        }
      );
    });
  }
};

// API Routes for Users
// Get all users
app.get("/users", authenticateToken, (req, res) => {
  pool.query("SELECT * FROM Users", (err, rows) => {
    if (err) throw err;
    res.send(rows);
  });
});

// Get a single user by ID
app.get("/users/:id", authenticateToken, (req, res) => {
  pool.query(
    "SELECT * FROM Users WHERE user_id = ?",
    [req.params.id],
    (err, rows) => {
      if (err) throw err;
      res.send(rows);
    }
  );
});

// Create a new user
app.post("/users", authenticateToken, (req, res) => {
  const { email, phone, name, password_hash } = req.body;
  pool.query(
    "INSERT INTO Users (email, phone, name, password_hash) VALUES (?, ?, ?, ?)",
    [email, phone, name, password_hash],
    (err, result) => {
      if (err) throw err;
      res.send(`User added with ID: ${result.insertId}`);
    }
  );
});

// Update a user
app.put("/users/:id", authenticateToken, (req, res) => {
  const { email, phone, name, password_hash } = req.body;
  pool.query(
    "UPDATE Users SET email = ?, phone = ?, name = ?, password_hash = ? WHERE user_id = ?",
    [email, phone, name, password_hash, req.params.id],
    (err, result) => {
      if (err) throw err;
      res.send("User updated successfully");
    }
  );
});
// Update a user
app.post("/change-password", authenticateToken, async (req, res) => {
  const { email, password } = req.body;
  const password_hash = await generateHash(password);
  pool.query(
    "UPDATE Users SET password_hash = ? WHERE email = ?",
    [password_hash, email],
    (err, result) => {
      if (err) throw err;
      res.send("User updated successfully");
    }
  );
});

// Delete a user
app.delete("/users/:id", authenticateToken, (req, res) => {
  pool.query(
    "DELETE FROM Users WHERE user_id = ?",
    [req.params.id],
    (err, result) => {
      if (err) throw err;
      res.send("User deleted successfully");
    }
  );
});

// Get all courses
app.get("/courses", authenticateToken, (req, res) => {
  pool.query("SELECT * FROM Courses", (err, rows) => {
    if (err) throw err;
    res.send(rows);
  });
});

// Get a single course by ID
app.get("/courses/:id", authenticateToken, (req, res) => {
  pool.query(
    "SELECT * FROM Courses WHERE course_id = ?",
    [req.params.id],
    (err, rows) => {
      if (err) throw err;
      res.send(rows);
    }
  );
});

// Create a new course
app.post("/courses", authenticateToken, (req, res) => {
  const { title, description, price, image, demo } = req.body;
  pool.query(
    "INSERT INTO Courses (title, description, price, image, demo) VALUES (?, ?, ?, ?, ?)",
    [title, description, price, image, demo],
    (err, result) => {
      if (err) throw err;
      res.send(`Course added with ID: ${result.insertId}`);
    }
  );
});

// Update a course
app.put("/courses/:id", authenticateToken, (req, res) => {
  const { title, description, price, image, demo } = req.body;
  pool.query(
    "UPDATE Courses SET title = ?, description = ?, price =?, image = ?, demo = ? WHERE course_id = ?",
    [title, description, price, image, demo, req.params.id],
    (err, result) => {
      if (err) throw err;
      res.send("Course updated successfully");
    }
  );
});

// Delete a course
app.delete("/courses/:id", authenticateToken, (req, res) => {
  //cannot delete from courses because of foreign key constraint
  pool.query(
    "DELETE FROM CourseCart WHERE course_id = ?",
    [req.params.id],
    (err, result) => {
      if (err) throw err;
      pool.query(
        "DELETE FROM Courses WHERE course_id = ?",
        [req.params.id],
        (err, result) => {
          if (err) throw err;
          res.send("Course deleted successfully");
        }
      );
    }
  );
});

// Get all groups
app.get("/groups", authenticateToken, (req, res) => {
  pool.query("SELECT * FROM `Groups`", (err, rows) => {
    if (err) throw err;
    res.send(rows);
  });
});

// Get a single group by ID
app.get("/groups/:id", authenticateToken, (req, res) => {
  pool.query(
    "SELECT * FROM `Groups` WHERE group_id = ?",
    [req.params.id],
    (err, rows) => {
      if (err) throw err;
      res.send(rows);
    }
  );
});

// Create a new course
app.post("/groups", authenticateToken, (req, res) => {
  const { title, description, image, price, demo } = req.body;
  pool.query(
    "INSERT INTO `Groups` (title, description, image, demo, price) VALUES (?, ?, ?, ?, ?)",
    [title, description, image, demo, price],
    (err, result) => {
      if (err) throw err;
      res.send(`Group added with ID: ${result.insertId}`);
    }
  );
});

// Update a course
app.put("/groups/:id", authenticateToken, (req, res) => {
  const { title, description, image, price, demo } = req.body;
  pool.query(
    "UPDATE `Groups` SET title = ?, description = ?,  image = ?, demo = ?, price = ? WHERE group_id = ?",
    [title, description, image, demo, price, req.params.id],
    (err, result) => {
      if (err) throw err;
      res.send("Group updated successfully");
    }
  );
});

// Delete a group
app.delete("/groups/:id", authenticateToken, (req, res) => {
  pool.query(
    "DELETE FROM `Groups` WHERE group_id = ?",
    [req.params.id],
    (err, result) => {
      if (err) throw err;
      res.send("Group deleted successfully");
    }
  );
});

// Get all books
app.get("/books", authenticateToken, (req, res) => {
  pool.query("SELECT * FROM Books", (err, rows) => {
    if (err) throw err;
    res.send(rows);
  });
});

// Get a single book by ID
app.get("/books/:id", authenticateToken, (req, res) => {
  pool.query(
    "SELECT * FROM Books WHERE book_id = ?",
    [req.params.id],
    (err, rows) => {
      if (err) throw err;
      res.send(rows);
    }
  );
});

// Create a new book
app.post("/books", authenticateToken, (req, res) => {
  const { title, author, description, price, image, demo } = req.body;
  pool.query(
    "INSERT INTO Books (title, author, description, price, image, demo) VALUES (?, ?, ?, ?, ?, ?)",
    [title, author, description, price, image, demo],
    (err, result) => {
      if (err) throw err;
      res.send(`Book added with ID: ${result.insertId}`);
    }
  );
});

// Update a book
app.put("/books/:id", authenticateToken, (req, res) => {
  const { title, author, description, price, image, demo } = req.body;
  pool.query(
    "UPDATE Books SET title = ?, author = ?, description = ?, price = ?, image = ?, demo = ? WHERE book_id = ?",
    [title, author, description, price, image, demo, req.params.id],
    (err, result) => {
      if (err) throw err;
      res.send("Book updated successfully");
    }
  );
});

// Delete a book
app.delete("/books/:id", authenticateToken, (req, res) => {
  //cannot delete from books because of foreign key constraint
  pool.query(
    "DELETE FROM BookCart WHERE book_id = ?",
    [req.params.id],
    (err, result) => {
      if (err) throw err;
      pool.query(
        "DELETE FROM Books WHERE book_id = ?",
        [req.params.id],
        (err, result) => {
          if (err) throw err;
          res.send("Book deleted successfully");
        }
      );
    }
  );
});

// Get all courses in the cart for a specific user
app.get("/course-cart/:user_id", authenticateToken, (req, res) => {
  const { user_id } = req.params;
  pool.query(
    "SELECT cc.cart_id, cc.user_id, c.course_id, c.title, c.description,c.price,c.image, cc.quantity FROM CourseCart cc JOIN Courses c ON cc.course_id = c.course_id WHERE cc.user_id = ? && cc.status = 0",
    [user_id],
    (err, results) => {
      if (err) return res.status(500).send("Error on the server.");
      if (results.length === 0) return res.json([]);
      res.json(results);
    }
  );
});

// Get all books in the cart for a specific user
app.get("/book-cart/:user_id", authenticateToken, (req, res) => {
  const { user_id } = req.params;
  pool.query(
    "SELECT bc.cart_id, bc.user_id, b.book_id, b.title, b.author, b.description, b.price, b.image, bc.quantity FROM BookCart bc JOIN Books b ON bc.book_id = b.book_id WHERE bc.user_id = ? && bc.status = 0",
    [user_id],
    (err, results) => {
      if (err) return res.status(500).send("Error on the server.");
      if (results.length === 0) return res.json([]);
      res.json(results);
    }
  );
});

// Add a course to the cart
app.post("/course-cart", authenticateToken, (req, res) => {
  const { user_id, course_id, quantity } = req.body;
  pool.query(
    "INSERT INTO CourseCart (user_id, course_id, quantity, status) VALUES (?, ?, ?, ?)",
    [user_id, course_id, quantity, 0],
    (err, result) => {
      if (err) throw err;
      res.send(`Added course with ID: ${course_id} to user cart`);
    }
  );
});

//Update a book in the cart
app.put("/book-cart/:user_id/:book_id", authenticateToken, (req, res) => {
  const { quantity } = req.body;
  pool.query(
    "UPDATE BookCart SET quantity = ? WHERE user_id = ? AND book_id = ?",
    [quantity, req.params.user_id, req.params.book_id],
    (err, result) => {
      if (err) throw err;
      res.send("Book updated in cart successfully");
    }
  );
});

// Remove a course from the cart
app.delete(
  "/course-cart/:user_id/:course_id",
  authenticateToken,
  (req, res) => {
    pool.query(
      "DELETE FROM CourseCart WHERE user_id = ? AND course_id = ?",
      [req.params.user_id, req.params.course_id],
      (err, result) => {
        if (err) throw err;
        res.send("Course removed from cart successfully");
      }
    );
  }
);

// Add a book to the cart
app.post("/book-cart", authenticateToken, (req, res) => {
  const { user_id, book_id, quantity } = req.body;
  pool.query(
    "INSERT INTO BookCart (user_id, book_id, quantity, status) VALUES (?, ?, ?, ?)",
    [user_id, book_id, quantity, 0],
    (err, result) => {
      if (err) throw err;
      res.send(`Added book with ID: ${book_id} to user cart`);
    }
  );
});
// Add new order
app.post("/submit-order", authenticateToken, (req, res) => {
  const {
    user_id,
    name,
    phone,
    email,
    city,
    district,
    address,
    bookCartId,
    courseCartId,
  } = req.body;
  pool.query(
    "INSERT INTO `order` (userId, `name`, phone, email, city, district, address, bookCartId, courseCartId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [
      user_id,
      name,
      phone,
      email,
      city,
      district,
      address,
      bookCartId,
      courseCartId,
    ],
    (err, result) => {
      if (err) throw err;
      res.send(`Added book with ID: to user cart`);
    }
  );
});

// Get all orders for a specific user
app.get("/orders/:user_id", authenticateToken, (req, res) => {
  const { user_id } = req.params;
  console.log("user_id: ", user_id);
  pool.query(
    "SELECT * FROM `order` WHERE userId = ?",
    [user_id],
    (err, results) => {
      if (err) return res.status(500).send("Error on the server.");
      if (results.length === 0) return res.json([]);
      res.json(results);
    }
  );
});

// Remove a book from the cart
app.delete("/book-cart/:user_id/:book_id", authenticateToken, (req, res) => {
  pool.query(
    "DELETE FROM BookCart WHERE user_id = ? AND book_id = ?",
    [req.params.user_id, req.params.book_id],
    (err, result) => {
      if (err) throw err;
      res.send("Book removed from cart successfully");
    }
  );
});

//payment successful
app.post("/payment-successful", authenticateToken, (req, res) => {
  const { user_id, book_id, course_id } = req.body;
  pool.query(
    "UPDATE BookCart SET status = 1, added_at = ? WHERE user_id = ? AND cart_id = ?",
    [new Date(), user_id, book_id],
    (err, result) => {
      if (err) throw err;
      pool.query(
        "UPDATE CourseCart SET status = 1, added_at = ? WHERE user_id = ? AND cart_id = ?",
        [new Date(), user_id, course_id],
        (err, result) => {
          if (err) throw err;
          res.send("Payment successful");
        }
      );
    }
  );
});

//get list course after payment successful
app.get("/course-after-payment/:user_id", authenticateToken, (req, res) => {
  const { user_id } = req.params;
  pool.query(
    "SELECT cc.cart_id, cc.user_id, cc.added_at, c.course_id, c.title, c.description,c.price,c.image, cc.quantity FROM CourseCart cc JOIN Courses c ON cc.course_id = c.course_id WHERE cc.user_id = ? && cc.status = 1",
    [user_id],
    (err, results) => {
      if (err) return res.status(500).send("Error on the server.");
      if (results.length === 0) return res.json([]);
      res.json(results);
    }
  );
});

//get list book after payment successful
app.get("/book-after-payment/:user_id", authenticateToken, (req, res) => {
  const { user_id } = req.params;
  pool.query(
    "SELECT bc.cart_id, bc.user_id, bc.added_at, b.book_id, b.title, b.author, b.description, b.price, b.image, bc.quantity FROM BookCart bc JOIN Books b ON bc.book_id = b.book_id WHERE bc.user_id = ? && bc.status = 1",
    [user_id],
    (err, results) => {
      if (err) return res.status(500).send("Error on the server.");
      if (results.length === 0) return res.json([]);
      res.json(results);
    }
  );
});

//buy a course, if user_id !== null => add to MyCourse table, if user_id === null => create a new user with random password and add to MyCourse table
app.post("/buy-course", authenticateToken, (req, res) => {
  const { user_id, course_id, email, phone, city, district, address, book_id } =
    req.body;
  //check if user_id exist in table Users, if exist => add course to MyCourses table
  if (user_id) {
    pool.query(
      "SELECT url from Courses WHERE course_id = ?",
      [course_id],
      (err, result) => {
        console.log("result: ", result);
        pool.query(
          "INSERT INTO MyCourses (user_id, course_id, city, district, address, book_id, userID, url_course) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          [
            null,
            course_id,
            city,
            district,
            address,
            book_id,
            user_id,
            result[0]?.url || "",
          ],
          (err, result) => {
            if (err) throw err;
            res.send({
              message: `Added course with ID: ${course_id} to user cart`,
              user_id,
            });
          }
        );
      }
    );
  } else {
    //check if user has email or phone in database
    pool.query(
      "SELECT * FROM Users WHERE email = ? OR phone = ?",
      [email, phone],
      async (err, results) => {
        if (err) return res.status(500).send("Error on the server.");
        if (results.length === 0) {
          //if user not exist, create new user
          const password = randomize("0", 6);
          const hashedPassword = await generateHash(password);
          pool.query(
            "INSERT INTO Users (email, phone, name, password_hash) VALUES (?, ?, ?, ?)",
            [email, phone, "", hashedPassword],
            (err, result) => {
              console.log("result: ", result);
              if (err) throw err;
              pool.query(
                "SELECT url from Courses WHERE course_id = ?",
                [course_id],
                (err, result2) => {
                  pool.query(
                    "INSERT INTO MyCourses (user_id, course_id, city, district, address, book_id, userID, url_course) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    [
                      null,
                      course_id,
                      city,
                      district,
                      address,
                      book_id,
                      result.insertId,
                      result2[0]?.url || "",
                    ],
                    (err, result) => {
                      if (err) throw err;
                      res.send({
                        message: `Added course with ID: ${course_id} to user cart`,
                        user_id: result.insertId,
                        password,
                      });
                    }
                  );
                  //send email to user
                  // Configuring Nodemailer to send email
                  const transporter = nodemailer.createTransport({
                    service: "hotmail",
                    // host: "smtp.gmail.com",
                    // port: 465,
                    port: 587,
                    secure: false, // Sử dụng TLS, không phải SSL
                    // secure: true,
                    auth: {
                      user: emailConfig, // Your Gmail email address
                      pass: passwordConfig, // Your Gmail password
                      // pass: "sjsf mgct fhvk bjkp", // Your Gmail password
                    },
                  });

                  // Email message options
                  const mailOptions = {
                    from: emailConfig, // Sender address
                    // from: "ctvdautubenvung@gmail.com", // Sender address
                    to: email, // Recipient address
                    subject: "Thông báo mua hàng thành công",
                    text: `Bạn đã mua khoá học thành công. Hãy đăng nhập bằng email và mật khẩu: ${password}`,
                  };

                  // Sending email
                  transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                      console.log(error);
                      // res
                      //   .status(500)
                      //   .json({ message: "Failed to send passcode via email" });
                    } else {
                      console.log("Email sent: " + info.response);
                      // res.status(200).json({
                      //   message: "Passcode sent successfully",
                      //   password,
                      // });
                    }
                  });
                }
              );
            }
          );
        } else {
          //if user exist, add course to MyCourses table
          pool.query(
            "SELECT url from Courses WHERE course_id = ?",
            [course_id],
            (err, result2) => {
              pool.query(
                "INSERT INTO MyCourses (user_id, course_id, city, district, address, book_id, userID, url_course) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                [
                  null,
                  course_id,
                  city,
                  district,
                  address,
                  book_id,
                  results[0]?.user_id,
                  result2[0]?.url || "",
                ],
                (err, result) => {
                  if (err) throw err;
                  res.send({
                    message: `Added course with ID: ${course_id} to user cart`,
                    user_id: results[0]?.user_id,
                  });
                }
              );
            }
          );
        }
      }
    );
  }

  //check if user has email or phone in database
});

//get title from title table
app.get("/title", authenticateToken, (req, res) => {
  pool.query("SELECT * FROM title", (err, results) => {
    if (err) return res.status(500).send("Error on the server.");
    res.json(results);
  });
});

//update title
app.post("/update_title", authenticateToken, (req, res) => {
  const { title_first, title_second, description, image_url } = req.body;
  pool.query(
    "UPDATE title SET title_first = ?, title_second = ?, description = ?, image_url=? WHERE id = 1",
    [title_first, title_second, description, image_url],
    (err, result) => {
      if (err) throw err;
      res.send(`Updated title`);
    }
  );
});

//get list user courses
app.get("/my-courses/:user_id", authenticateToken, (req, res) => {
  const { user_id } = req.params;
  pool.query(
    "SELECT mc.course_id, c.title, c.description, c.price, c.image, mc.enroll_date, c.url FROM MyCourses mc JOIN Courses c ON mc.course_id = c.course_id WHERE mc.userID = ?",
    [user_id],
    (err, results) => {
      if (err) return res.status(500).send("Error on the server.");
      if (results.length === 0) return res.json([]);
      res.json(results);
    }
  );
});

//api nhận tài liệu qua email
app.post("/send-document", authenticateToken, (req, res) => {
  const { email } = req.body;

  //send email to user
  // Configuring Nodemailer to send email
  const transporter = nodemailer.createTransport({
    service: "hotmail",
    // host: "smtp.gmail.com",
    // port: 465,
    port: 587,
    secure: false, // Sử dụng TLS, không phải SSL
    // secure: true,
    auth: {
      user: emailConfig, // Your Gmail email address
      pass: passwordConfig, // Your Gmail password
      // pass: "sjsf mgct fhvk bjkp", // Your Gmail password
    },
  });

  // Email message options
  const mailOptions = {
    from: emailConfig, // Sender address
    // from: "ctvdautubenvung@gmail.com", // Sender address
    to: email, // Recipient address
    subject: "Thông báo nhận tài liệu qua email",
    text: `Bạn đã đăng ký nhận tài liệu miễn phí thành công. Hãy kiểm tra email để nhận tài liệu`,
  };

  // Sending email
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
      res.status(500).json({ message: "Failed to send passcode via email" });
    } else {
      console.log("Email sent: " + info.response);
      res.status(200).json({ message: "Passcode sent successfully", password });
    }
  });

  //insert mail into Email_Free_Document table
  pool.query(
    "INSERT INTO Email_Free_Document (email) VALUES (?)",
    [email],
    (err, result) => {
      if (err) throw err;
      res.send(`Đăng ký nhận tài liệu thành công`);
    }
  );
});

//get list user books
app.get("/my-books/:user_id", authenticateToken, (req, res) => {
  const { user_id } = req.params;
  pool.query(
    "SELECT mb.book_id, b.title, b.author, b.description, b.price, b.image, mb.enroll_date FROM MyCourses mb JOIN Books b ON mb.book_id = b.book_id WHERE mb.userID = ?",
    [user_id],
    (err, results) => {
      if (err) return res.status(500).send("Error on the server.");
      if (results.length === 0) return res.json([]);
      res.json(results);
    }
  );
});

// Ideally, store this in an environment variable

// Helper functions
const generateHash = async (password) => {
  return await bcrypt.hash(password, 10);
};

const validatePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

const generateToken = (user_id) => {
  return jwt.sign({ user_id }, JWT_SECRET, { expiresIn: "24h" });
};

// Register new user
app.post("/auth/register", async (req, res) => {
  const { email, phone, name, password } = req.body;
  console.log("req: ", req);
  console.log("email: ", email);
  const hashedPassword = await generateHash(password);

  pool.query(
    "INSERT INTO Users (email, phone, name, password_hash) VALUES (?, ?, ?, ?)",
    [email, phone, name, hashedPassword],
    (err, result) => {
      if (err) return res.status(500).send(err);
      res.status(201).send("User registered successfully");
    }
  );
});

// Login
app.post("/auth/login", async (req, res) => {
  const { phone, password } = req.body;

  pool.query(
    "SELECT * FROM Users WHERE phone = ? or email = ?",
    [phone, phone],
    async (err, results) => {
      if (err) return res.status(500).send(err);
      if (results.length === 0) return res.status(404).send("User not found");

      const user = results[0];
      const passwordIsValid = await validatePassword(
        password,
        user.password_hash
      );

      if (!passwordIsValid) return res.status(401).send("Invalid password");

      // Invalidate previous tokens
      pool.query("DELETE FROM ActiveTokens WHERE user_id = ?", [user.user_id]);

      // Generate a new token
      const token = generateToken(user.user_id);

      // Store the new token
      const tokenExpiry = new Date();
      tokenExpiry.setHours(tokenExpiry.getHours() + 24); // Set token expiry for 24 hours
      pool.query(
        "INSERT INTO ActiveTokens (user_id, token, expires_at) VALUES (?, ?, ?)",
        [user.user_id, token, tokenExpiry],
        (err, result) => {
          if (err) return res.status(500).send(err);
          res.json({ token, user_id: user.user_id, info: phone });
        }
      );
      res.json({ token, user_id: user.user_id, info: phone });
    }
  );
});

// Forgot Password
// Route for forgot password
app.post("/auth/forgot-password", (req, res) => {
  // Extract email from request body
  const { email } = req.body;

  // Generate 6-digit passcode
  const passcode = randomize("0", 6);

  // Configuring Nodemailer to send email
  const transporter = nodemailer.createTransport({
    service: "hotmail",
    // host: "smtp.gmail.com",
    // port: 465,
    port: 587,
    secure: false, // Sử dụng TLS, không phải SSL
    // secure: true,
    auth: {
      user: emailConfig, // Your Gmail email address
      pass: passwordConfig, // Your Gmail password
      // pass: "sjsf mgct fhvk bjkp", // Your Gmail password
    },
  });

  // Email message options
  const mailOptions = {
    from: emailConfig, // Sender address
    // from: "ctvdautubenvung@gmail.com", // Sender address
    to: email, // Recipient address
    subject: "Yêu cầu đổi mật khẩu",
    text: `Mã đổi mật khẩu của bạn là: ${passcode}`,
  };

  // Sending email
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
      res.status(500).json({ message: "Failed to send passcode via email" });
    } else {
      console.log("Email sent: " + info.response);
      res.status(200).json({ message: "Passcode sent successfully", passcode });
    }
  });
});

// Secure route example (requires token verification)
app.get("/secure-info", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1]; // Authorization: Bearer <token>

  if (!token) return res.status(401).send("No token provided");

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).send("Invalid Token");

    res.send("Secure info access granted: " + JSON.stringify(decoded));
  });
});

app.post("/auth/logout", authenticateToken, (req, res) => {
  // Remove the token from the ActiveTokens table
  pool.query(
    "DELETE FROM ActiveTokens WHERE token = ?",
    [req.headers.authorization?.split(" ")[1]],
    (err, result) => {
      if (err) return res.status(500).send("Logout failed");
      res.send("Logged out successfully");
    }
  );
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
