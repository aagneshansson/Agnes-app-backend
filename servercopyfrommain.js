// import express from 'express';
// import bodyParser from 'body-parser';
// import cors from 'cors';
// import mongoose from 'mongoose';
// import crypto from "crypto";
// import bcrypt from 'bcrypt';

// const mongoUrl = process.env.MONGO_URL || "mongodb://localhost/agnes"
// mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true })
// mongoose.Promise = Promise

// const userSchema = new mongoose.Schema({
//     name: {
//       type: String,
//       unique: true,
//       minLength: 5
//     }, 
//     password: { 
//       type: String,
//       required: true,
//       minLength: 5
//     },
//     accessToken: {
//       type: String,
//       default: () => crypto.randomBytes(128).toString('hex'),
//       unique: true,
//     },
//     project: [{
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'Project',
//     }]
// });

// const Project = new mongoose.model('Project', {
//   userId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "User"
//   },
//   projectname: {
//     type: String,
//     unique: true,
//   },
//   createdAt: {
//     type: Date,
//     default: Date.now,
//   }
// })

// // Pre-save - to check password validation before hashing the password 
// userSchema.pre('save', async function (next) {
//   const user = this;

//   if (!user.isModified('password')) {
//     return next();
//   }

//   const salt = bcrypt.genSaltSync(); // the number between () is for how much variation you want in the password 8
//     console.log(`PRE SALT PASSWORD ${user.password}`)
//   user.password = bcrypt.hashSync(user.password, salt)
//     console.log(`PAST SALT PASSWORD ${user.password}`)

//   //Continue with save
//   next();
// });

// To be able to authenticate the user check for coming endpoints
// COMMENT OUT THIS AS IT's CAUSING ERROR 

// const authenticateUser = async (req, res, next) => {
//   try {
//     const accessToken = req.header('Authorization');
//     const user = await User.findOne({ accessToken });
//       if (!user) {
//         throw 'User not found';
//       }
//     req.user = user; 
//   } catch (err) {
//     const errorMessage = "Login failed, please try again!";
//   console.log('AuthenticateUser function')
//   res.status(401).json({ error: errorMessage });
//   }
//   next();
// };

// // New authenticateUser which Karol helped me to create
// const authenticateUser = async (req, res, next) => {
//   const user = await User.findOne({ accessToken: req.header("Authorization") })
//   if (user) {
//     req.user = user
//     next()
//   } else {
//     res.status(403).json({ loggedOut: true })
//   }
// }

// const User = mongoose.model('User', userSchema);

// //   PORT=9000 npm start
// const port = process.env.PORT || 8080;
// const app = express();

// // Add middlewares to enable cors and json body parsing
// app.use(cors());
// app.use(bodyParser.json());

// // To list all available endpoints on the starting page
// const listEndpoints = require('express-list-endpoints');
// app.get('/', (req, res) => {
//   res.send(listEndpoints(app));
// });

// // Start defining your routes here
// app.get('/', (req, res) => {
//   res.send('Hi, welcome to our server')
// });

// // Create user - sign up
// app.post("/users", async (req, res) => {
//   try {
//     const { name, password } = req.body;
//       console.log(`Name: ${name}`);
//       console.log(`Password: ${password}`);
//     const user = await new User({
//       name,
//       password,
//     }).save();
//     res.status(200).json({ userId: user._id, accessToken: user.accessToken });
//   } catch (err) {
//     res.status(400).json({ message: 'Could not create user', errors: err });
//   }
// });

// // Login user
// app.post("/sessions", async (req, res) => {
//   try {
//     const { name, password } = req.body;
//     const user = await User.findOne({ name });

//     if (user && bcrypt.compareSync(password, user.password)) {
//       //Compare passwords
//       res.status(200).json({ userId: user._id, accessToken: user.accessToken });
//     } else { 
//       throw 'User not found';
//     }
//   } catch (err) { 
//     res.status(404).json({ error: 'User not found' });
//   }
// });

// app.get('/secret', authenticateUser);
// app.get('/secret/', async (req, res) => {
//   const secretMessage = `This is a secret message for ${req.user.name}`;
//   res.status(200).json({ secretMessage });
// });

// // Post a project
// app.post("/project", authenticateUser, async (req, res) => {
//   const { projectname } = req.body
//   console.log(req.user._id)
//   const user = await User.findById(req.user._id)
//   if (user) {
//     const userId = user._id
//     const project = await new Project({
//       projectname,
//       userId
//     }).save()
//     res.status(200).json(project)
//   } else {
//     res.status(400).json({ message: "Could not create contact" })

//   }
// })
// // Get projects to create a projectlist
// app.get('/projectlist', authenticateUser)
// app.get('/projectlist', async (req, res) => {
//   const projects = await Project.find({ userId: req.user._id })
//     .sort({ createdAt: 'desc' })
//     .limit(20)
//     .exec()
//   res.json(projects)
// })

// // // Post a project
// // app.post("/project", authenticateUser);
// // app.post("/project", async (req, res) => {
// //     try {
// //       const { userId } = req.user._id;
// //       const { projectname } = req.body;
// //       const project = await new Project({
// //         projectname, userId
// //       }).save();
// //       res.status(200).json(project);
// //     } catch (err) {
// //       res.status(400).json({ message: "Could not create contact", errors: err })
// //     }
// //   });

// // // Get projects to create a projectlist
// // app.get('/projectlist', authenticateUser);
// // app.get('/projectlist', async (req, res) => {
// //   const { userId } = req.user._id;
// //   const projects = await Project.find({ userId })
// //     .sort({ createdAt: 'desc' })
// //     .limit(20)
// //     .exec();
// //   res.json(projects);
// // });
    
// // Endpoint for Log out
// app.post("/logout", authenticateUser);
// app.post("/logout", async (req, res) => {
//     try {
//       req.user.userId = null;
//       await req.user.save();
//       res.status(200).json({ loggedOut: true });
//     } catch (err) {
//       res.status(400).json({ error: 'Could not logout'})
//     }
//   });
  
//   // Start the server
//   app.listen(port, () => {
//     console.log(`Server running on http://localhost:${port}`)
//   });