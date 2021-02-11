import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import mongoose from 'mongoose'
import crypto from "crypto"
import bcrypt from 'bcrypt'
import listEndpoints from 'express-list-endpoints'

const mongoUrl = process.env.MONGO_URL || "mongodb://localhost/organizeit"
mongoose.set('useCreateIndex', true)
mongoose.connect(mongoUrl, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true, // To get rid of deprecation warning regarding collection.ensureIndex
  useFindAndModify: false // To get rid of deprecation warning regarding findOneAndUpdate()
})
mongoose.Promise = Promise

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    unique: true,
    minLength: 5
  },
  password: {
    type: String,
    required: true,
    minLength: 5
  },
  accessToken: {
    type: String,
    default: () => crypto.randomBytes(128).toString('hex'),
    unique: true,
  },
  project: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
  }]
})

const Project = new mongoose.model('Project', {
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  projectname: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  memberId: [{
    // type: String,
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
})

// Pre-save - to check password validation before hashing the password 
userSchema.pre('save', async function (next) {
  const user = this

  if (!user.isModified('password')) {
    return next()
  }

  const salt = bcrypt.genSaltSync() // the number between () is for how much variation you want in the password 8
  console.log(`PRE SALT PASSWORD ${user.password}`)
  user.password = bcrypt.hashSync(user.password, salt)
  console.log(`PAST SALT PASSWORD ${user.password}`)

  //Continue with save
  next()
})

// Authenticate the user 
const authenticateUser = async (req, res, next) => {
  const user = await User.findOne({ accessToken: req.header("Authorization") }).populate("project")
  if (user) {
    req.user = user
    next()
  } else {
    res.status(403).json({ loggedOut: true })
  }
}

// Declaring the user model 
const User = mongoose.model('User', userSchema)

// PORT=9000 npm start
const port = process.env.PORT || 8080
const app = express()

// Add middlewares to enable cors and json body parsing
app.use(cors())
app.use(bodyParser.json())

// To list all available endpoints on the starting page
app.get('/', (req, res) => {
  res.send(listEndpoints(app))
})

// Create user - sign up
app.post("/users", async (req, res) => {
  try {
    const { name, password } = req.body
    console.log(`Name: ${name}`)
    console.log(`Password: ${password}`)
    const user = await new User({
      name,
      password,
    }).save()
    res.status(200).json({ userId: user._id, accessToken: user.accessToken })
  } catch (err) {
    res.status(400).json({ message: 'Could not create user', errors: err })
  }
})

// Get all users
app.get('/allusers', authenticateUser);
app.get('/allusers', async (req, res) => {
  const users = await User.find();
  res.json(users);
})

// Login user
app.post("/sessions", async (req, res) => {
  try {
    const { name, password } = req.body
    const user = await User.findOne({ name })

    if (user && bcrypt.compareSync(password, user.password)) {
      //Compare passwords
      res.status(200).json({ userId: user._id, accessToken: user.accessToken })
    } else {
      throw 'User not found'
    }
  } catch (err) {
    res.status(404).json({ error: 'User not found' })
  }
})

app.get('/secret', authenticateUser)
app.get('/secret/', async (req, res) => {
  const secretMessage = `This is a secret message for ${req.user.name}`
  res.status(200).json({ secretMessage })
})

// Post a project
app.post("/project", authenticateUser, async (req, res) => {
  try {
    const userId = req.user._id;
    console.log(`This is the req.user._id ${req.user._id}`)
    console.log(`This is the userId ${userId}`)
    const projectname = req.body.projectname;
    const memberId = req.body.memberId;

    console.log(`This is the memberId ${memberId}`)

    const project = await new Project({
      projectname, userId, memberId: memberId
    }).save();
    console.log(project)
    res.status(200).json(project);
  } catch (err) {
    res.status(400).json({
      message: "Could not create project", errors: err
    })
  }
});

//Get projects to create a projectlist - AGNES
app.get('/projectlist', authenticateUser);
app.get('/projectlist', async (req, res) => {
  const userId = req.user._id;

  const projects = await Project.find({ userId })
    .populate('userId')
    // .populate('memberId')
    .sort({ createdAt: 'desc' })
    .limit(20)
    .exec();
  // const user = await User.findById(projects[0].userId)
  // console.log(projects[0].userId.name)
  res.json(projects);
});

// Get all the projects a user are a member of 
app.get('/member', authenticateUser);
app.get('/member', async (req, res) => {
  const userId = req.user._id;

  const members = await Project.find({ "memberId": userId })
  .populate('userId')
    // .sort({ createdAt: 'desc' })
    // .limit(20)
  .exec();
    members.forEach(member => member.populate("userId"))
  res.json(members);

  //     const userId = req.user._id;
  //     console.log(`userId in projectlist ${userId}`)
  //     const memberId = req.user.members;
  //     console.log(`MemberId in projectlist ${memberId}`)
  //     const allprojects = await Project.find({ userId, memberId })
  //     console.log(allprojects);
  //   if (allprojects) {
  //     res.status(allprojects);
  //   } else { res.status(404).json({ error: "Could not find list"})
  // }
});

// Endpoint to DELETE a project
// app.delete('/delete/:id', authenticateUser);
// app.delete('/delete/:id', async (req, res) => {
//   try {
//     // const _id = req.params.id;
//     await Project.deleteOne({ _id: req.params._id });
//     res.status(200).json({ message: 'Project deleted' })
//   } catch (err) {
//     res.status(400).json({
//       message: 'Could not delete project',
//       error: err
//     })
//   }
// })

app.delete('/delete/:id', async (req, res) => {
  const { projectId } = req.params;
  try {
    await Project.deleteOne({ _id: projectId });
    res.status(200).json({ message: 'Project deleted' })
  } catch (err) {
    res.status(500).json({
      message: 'Could not delete project',
      error: err
    })
  }
})

// Endpoint for Log out
app.post("/logout", authenticateUser)
app.post("/logout", async (req, res) => {
  try {
    req.user.userId = null
    await req.user.save()
    res.status(200).json({ loggedOut: true })
  } catch (err) {
    res.status(400).json({ error: 'Could not logout' })
  }
})

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})