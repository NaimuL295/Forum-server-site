require('dotenv').config()
const express = require('express');
const { MongoClient, ServerApiVersion, } = require('mongodb');
const app= express();
const port=process.env.PORT ||5000;
const cors=require("cors")
const  cookieParser = require('cookie-parser');
const  jwt = require('jsonwebtoken');

app.use(cors());

// {origin:["http://localhost:5173", "http://localhost:5174"],
// credentials:true,}
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.y2b3ywc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;


const verifyToken=(req,res,next)=>{
  const token =req.cookieParser?.token;
   if (!token) {
    return res.status(402).send({message:"unauthorized access"})
   }

   jwt.verify(token, process.env.JWT_ACCESS_SECRET,(err,decoded)=>{
    if (err) {
      return res.status(403).send({message:"unauthorized access"})
    }
    req.decoded=decoded
    next()
   })
}
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
  //  await client.connect();
    // Send a ping to confirm a successful connection
 const myFocus= client.db("focusDb");
 const usersCollection = myFocus.collection('users');
const postsCollection = myFocus.collection('posts');
 const commentsCollection = myFocus.collection('comments');
 const announcementsCollection = myFocus.collection('announcements');
 const tagsCollection = myFocus.collection('tags');
 const reportsCollection = myFocus.collection('reports');
 const paymentsCollection = myFocus.collection('payments');

app.post('/jwt',(req,res)=>{

 const {email}= req.body;

 if (!email) {
   return res.status(400).send("Email is required")
 }
 const token=  jwt.sign(
  {email},
  process.env.JWT_ACCESS_SECRET,
  {expiresIn:"4h"}
  
 )

 res.cookie("token",token,{
  httpOnly:true,
  secure:false,
  sameSite:"none"
 })
 res.send({success:true})
})



app.post("/make/announcement", async (req, res) => {
  const { authorName, authorImage, title, description } = req.body;
  
  
console.log(req.body);

  try {
    const result = await announcementsCollection.insertOne({
      authorName,
      authorImage,
      title,
      description,
      createdAt: new Date(),
    });
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to create announcement" });
  }
});

// GET: Get all announcements
app.get("/announcements", async (req, res) => {
 
  try {
    const announcements = await announcementsCollection
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
    res.json(announcements);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch announcements" });
  }
});

app.get("/announcements/count", async (req, res) => {
  try {
    const count = await announcementsCollection.countDocuments();
    res.json({ count });
  } catch (err) {
    console.error("Error counting announcements:", err);
    res.status(500).json({ error: "Failed to fetch count" });
  }
});

  app.post("/create/posts", async (req, res) => {
  const post = req.body;
  console.log(req.body);
  
  post.createdAt = new Date().toISOString();
  post.upVote = 0;
  post.downVote = 0;

 try {
    // Check if collection is available
    if (!postsCollection) {
      throw new Error("Database connection not established");
    }
    
    const result = await postsCollection.insertOne(post);
    res.status(201)
      .json({ message: "Post added successfully", insertedId: result.insertedId });
  } catch (error) {
    console.error("Failed to insert post:", error);
    res.status(500).json({ error: "Failed to add post" });
  }
});



app.get("/user/post/email", async (req, res) => {
  const { emailParams } = req.query;

  // Construct the query object
  let query = {};
  if (emailParams) {
    query = { email: { $regex: emailParams, $options: "i" } }; 
  }

  try {
    // Fetch user posts based on the constructed query
    const userPosts = await postsCollection
      .find(query)  // Use the query object here
      .sort({ createdAt: -1 })  
      .toArray();

    res.json(userPosts);
  } catch (error) {
    console.error("Failed to fetch user posts:", error);
    res.status(500).json({ error: "Failed to fetch user posts" });
  }
});
 app.get("/user/only",async(req,res)=>{
  const {emailParams}=req.query;
   let query = {};
  if (emailParams) {
    query = { email: { $regex: emailParams, $options: "i" } }; 
  }
 
const userPosts = await usersCollection.find(query)  
      .sort({ createdAt: -1 })  
      .toArray();
      res.json(userPosts);
 })

// app.get("/myPost", async (req, res) => {
 

//   try {
//     const posts = await postsCollection.find().sort({ createdAt: -1 }).toArray();
//     res.json(posts);
//   } catch (error) {
//     res.status(500).json({ error: "Failed to fetch posts" });
//   }
// });



// 🔹 Get Posts By User Email





// app.post('/create-payment-intent', async (req, res) => {
//   try {
//     const { amountInCents, currency } = req.body;

   
//     const paymentIntent = await stripe.paymentIntents.create({
//       amount: amountInCents,
//       currency: currency,
//       payment_method_types: ['card'],
//     });

//     res.send({
//       clientSecret: paymentIntent.client_secret,
//     });
//   } catch (error) {
//     console.error('Error creating payment intent:', error);
//     res.status(500).send({ error: error.message });
//   }
// });

// Endpoint to update the user's badge (after successful payment)
// app.patch('/user', (req, res) => {
//   const { badge } = req.body;
//   const userId = 1; // Hardcoded user id (assuming single user for now)

//   const user = usersCollection.find(user => user.id === userId);
//   if (user) {
//     user.badge = badge; // Update the badge to Gold
//     res.send({ success: true, message: 'User badge updated' });
//   } else {
//     res.status(404).send({ success: false, message: 'User not found' });
//   }
// });;
app.get("/admin/overview", async (req, res) => {
  try {
    const [postCount, commentCount, userCount] = await Promise.all([
      postsCollection.countDocuments(),
      commentsCollection.countDocuments(),
      usersCollection.countDocuments(),
    ]);

    res.json({ postCount, commentCount, userCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch overview data" });
  }
});


app.post("/tags", async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Tag name is required" });

  try {
    // Optional: check if tag already exists
    const existing = await tagsCollection.findOne({ name });
    if (existing) {
      return res.status(409).json({ error: "Tag already exists" });
    }

    const result = await tagsCollection.insertOne({ name });
    res.status(201).json({ message: "Tag added", insertedId: result.insertedId });
  } catch (error) {
    res.status(500).json({ error: "Failed to add tag" });
  }
});



// Admin
app.get("/usersAll", async (req, res) => {
  try {
    const search = req.query.search || "";
    console.log(search);
    
    const users = await usersCollection.find({
      displayName: { $regex: search, $options: "i" }
    }).toArray();
    res.send(users);
    console.log(users);
    
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching users");
  }
});

// Admin
app.patch("/users/admin/:id", async (req, res) => {
  const id = req.params.id;
  const result = await usersCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: { role: "admin" } }
  );
  res.send(result);
});







app.post("/user", async (req, res) => {
  const user = req.body;
  const { email } = user;

  if (!email || !user.name || !user.photo) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // Optional: Check if user already exists
    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: "User already exists" });
    }

    // Insert user
    const result = await usersCollection.insertOne({
      ...user,
      badge: user.badge || "Bronze", // default badge
      role: "user", // optional: role assignment
      createdAt: new Date()
    });

    res.status(201).json({ message: "User created successfully", insertedId: result.insertedId });
  } catch (error) {
    console.error("Error saving user:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});






   await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
   // await client.close();
  }
}
run().catch(console.dir);


app.get("/",(req,res)=>{
res.send("server run")
})                 


app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
