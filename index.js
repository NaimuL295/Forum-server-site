require('dotenv').config()
const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId, } = require('mongodb');
const app= express();
const port=process.env.PORT ||5000;
const cors=require("cors")
const  cookieParser = require('cookie-parser');
const  jwt = require('jsonwebtoken');

const stripe = require('stripe')(process.env.PAYMENT_GATEWAY_KEY);

app.use(express.json());
app.use(cookieParser());

app.use(cors({origin:["http://localhost:5173", "http://localhost:5174"],
credentials:true,}));
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.y2b3ywc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;



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
 
const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  console.log(token,"ok");
  
  if (!token) {
    return res.status(401).send({ message: 'unauthorized access' })
  }
  jwt.verify(token, process.env.JWT_ACCESS_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).send({ message: 'unauthorized access' })
    }
    req.decoded = decoded;
    next();
  });

}

  
const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;

            const query = { email }
            const user = await usersCollection.findOne(query);
            if (!user || user.role !== 'admin') {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next();
        }


app.post('/jwt', (req, res) => {
 
  const { email } = req.body;


  if (!email) {
    return res.status(400).send('Email is required');
  }
  const token = jwt.sign(
    { email }, 
    process.env.JWT_ACCESS_SECRET,  { expiresIn: '2h' }
  );


  res.cookie('token', token, {
    httpOnly: true,
    secure: true, 
    sameSite:"none"
    // domain: '.vercel.app',
     //  path: '/',
  });

  res.send({ success: true });
});


// search
app.get("/posts/search", async (req, res) => {
  const tag = req.query.tag;
  if (!tag) {
    return res.status(400).json({ error: "Tag is required" });
  }

  try {
    const posts = await postsCollection.find({
        tag: { $regex: tag, $options: "i" }, // case-insensitive, partial match
      })
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json(posts);
  } catch (error) {
   
    res.status(500).json({ error: "Internal server error" });
  }
});


app.delete("/comments/:id", async (req, res) => {
  const commentId = req.params.id;

  try {
    const result = await commentsCollection("comments").deleteOne({ _id: new ObjectId(commentId) });

    if (result.deletedCount === 1) {
      res.status(200).json({ message: "Comment deleted" });
    } else {
      res.status(404).json({ error: "Comment not found" });
    }
  } catch (error) {
   
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/make/announcement", async (req, res) => {
  const { authorName, authorImage, title, description } = req.body;

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
   
    res.status(500).json({ error: "Failed to fetch count" });
  }
});

  app.post("/create/posts", async (req, res) => {
  const post = req.body;
  
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
  
    res.status(500).json({ error: "Failed to add post" });
  }
});



app.get("/user_email",  async (req, res) => {
  const { emailParams } = req.query;


  
  let query = {};
  if (emailParams) {
    query.email = { $regex: emailParams, $options: "i" }; // Case-insensitive search
  }


  try {
    // Count the user posts matching the email query
    const userPostsCount = await postsCollection.countDocuments(query);

    res.json({  userPostsCount });
  } catch (error) {
   
    res.status(500).json({ error: "Failed to count user posts" });
  }
});




// myPost
app.get("/user/post/email", verifyToken, async (req, res) => {
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
   // console.error("Failed to fetch user posts:", error);
    res.status(500).json({ error: "Failed to fetch user posts" });
  }
});

 app.get("/user/only", verifyToken ,async(req,res)=>{
  const {emailParams}=req.query;
   let query = {};
  if (emailParams) {
    query = { email: { $regex: emailParams, $options: "i" } }; 
  }
 
const userPosts = await usersCollection.findOne(query)  
      res.json(userPosts);
 })


app.delete("/post_delate/:id",async(req,res)=>{
  const id=req.params.id
 
  const query={_id:new ObjectId(id)}
  const result =postsCollection.deleteOne(query)
  res.send(result)
})





app.post('/create-payment-intent', async (req, res) => {
  const { amountInCents, currency } = req.body;

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency,
      payment_method_types: ['card'],
    });

    res.send({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
   
    res.status(500).send({ error: err.message });
  }
});

app.patch('/user_payment', async (req, res) => {
  const { badge } = req.body;
  const email = req.query.email;

  if (!email || !badge) {
    return res.status(400).send({ success: false, message: 'Email and badge required' });
  }

  try {
    const result = await usersCollection.updateOne(
      { email: email },
      { $set: { badge: badge } }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).send({ success: false, message: 'User not found or badge already set' });
    }

    res.send({ success: true, message: 'Badge updated successfully' });
  } catch (err) {
    res.status(500).send({ success: false, message: err.message });
  }
});

// end



// role check
app.get("/users/:email/role", verifyToken, async (req, res) => {
  const email = req.params.email;

  try {
    const user = await usersCollection.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ role: user.role || "user" }); 
  } catch (error) {
    
    res.status(500).json({ error: "Internal server error" });
  }
});
// check
app.get("/users_/:email", verifyToken,verifyAdmin,  async (req, res) => {
  const email = req.params.email;
  try {
    const user = await usersCollection.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json(user);
  } catch (err) {
   
    res.status(500).json({ error: "Server error" });
  }
});




// admin start
app.get("/admin/overview", async (req, res) => {
  try {
    const [postCount, commentCount, userCount] = await Promise.all([
      postsCollection.countDocuments(),
      commentsCollection.countDocuments(),
      usersCollection.countDocuments(),
    ]);

    res.json({ postCount, commentCount, userCount });
  } catch (error) {
    
    res.status(500).json({ error: "Failed to fetch overview data" });
  }
});


app.post("/tags", async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Tag name is required" });

  try {
    
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
app.get("/tags_list", async (req, res) => {
  try {
    const tags = await tagsCollection.find().toArray();
    res.status(200).json(tags);
  } catch (error) {
   
    res.status(500).json({ error: "Failed to fetch tags" });
  }
});



// Admin
app.get("/usersAll", async (req, res) => {
  try {
    const search = req.query.search || "";
    
    
    const users = await usersCollection.find({
      displayName: { $regex: search, $options: "i" }
    }).toArray();
    res.send(users);
    
    
  } catch (error) {
    
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










// new
app.get("/postsDetails/:id", async (req, res) => {
  const { id } = req.params;
  const post = await postsCollection.findOne({ _id: new ObjectId(id) });
  res.send(post);
});


app.patch("/posts/:id/vote", async (req, res) => {
  const { id } = req.params;
  const { type } = req.body;

  const update = type === "up"
    ? { $inc: { upVote: 1 } }
    : { $inc: { downVote: 1 } };

  const result = await postsCollection.updateOne({ _id: new ObjectId(id) }, update);
  res.send(result);
});

app.get("/comments/post/:postId", async (req, res) => {
  const { postId } = req.params;
  const comments = await commentsCollection.find({ postId }).toArray();
  res.send(comments);
});

// Add new comment
app.post("/comments", async (req, res) => {
  const comment = req.body;
  comment.createdAt = new Date();
  const result = await commentsCollection.insertOne(comment);
  res.send(result);
});

//Report a comment
app.post("/comments/report/:commentId", async (req, res) => {
  const { commentId } = req.params;
  const { feedback } = req.body;

  const comment = await commentsCollection.findOne({ _id: new ObjectId(commentId) });
  if (!comment) return res.status(404).json({ error: "Comment not found" });

  const report = {
    commentId,
    postId: comment.postId,
    email: comment.email,
    name: comment.name || null,
    feedback,
    reportedAt: new Date(),
    status: "pending"
  };

  const result = await reportsCollection.insertOne(report);
  res.send(result);
});

// Get all reported comments (admin)
app.get("/reports-all", async (req, res) => {
  const reports = await reportsCollection.find().sort({ reportedAt: -1 }).toArray();
  res.send(reports);
});
// 


app.delete("/comments_remove/:commentId/:reportId", async (req, res) => {
  const { commentId, reportId } = req.params;

  try {
    const commentObjectId = new ObjectId(commentId);
    const reportObjectId = new ObjectId(reportId);

    const commentResult = await commentsCollection.deleteOne({ _id: commentObjectId });
    const reportResult = await reportsCollection.deleteOne({ _id: reportObjectId });

    if (commentResult.deletedCount === 0) {
      return res.status(404).json({ message: "Comment not found" });
    }

    res.status(200).json({ message: "Comment and report deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});






app.get('/tags_data', async (req, res) => {
  try {
    const tags = await tagsCollection.find().toArray();
    res.status(200).json(tags);
  } catch (error) {
   
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});




// Express route to get paginated + sorted posts
app.get("/posts", async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5;
  const sort = req.query.sort || "newest";

  const skip = (page - 1) * limit;

  try {
    const pipeline = [];

    if (sort === "popular") {
      pipeline.push({
        $addFields: {
          voteDifference: { $subtract: ["$upVote", "$downVote"] },
        },
      });
      pipeline.push({ $sort: { voteDifference: -1 } });
    } else {
      pipeline.push({ $sort: { createdAt: -1 } });
    }

    pipeline.push({ $skip: skip }, { $limit: limit });

    const posts = await postsCollection.aggregate(pipeline).toArray();
    const totalItems = await postsCollection.countDocuments();
    const totalPages = Math.ceil(totalItems / limit);

    res.send({
      posts,
      totalItems,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});




app.post("/user", async (req, res) => {
  
  const user = req.body;
  const { email } = user;
  if (!email || !user.name || !user.photo) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
   
    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: "User already exists" });
    }

    // Insert user
    const result = await usersCollection.insertOne({
      ...user,
      badge: user.badge || "Bronze",
      role: "user", 
      createdAt: new Date()
    });

    res.status(201).json({ message: "User created successfully", insertedId: result.insertedId });
  } catch (error) {
    
    res.status(500).json({ error: "Internal Server Error" });
  }
});



  // await client.db("admin").command({ ping: 1 });
 //   console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
   // await client.close();
  }
}
run().catch(console.dir);


app.get("/", (req, res) => {
  res.json({ message: "API is running" });
});




app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
