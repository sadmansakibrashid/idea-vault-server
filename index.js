const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { createRemoteJWKSet, jwtVerify } = require('jose-cjs');
dotenv.config();
const uri = process.env.MONGODB_URI;

const app = express();
const PORT = process.env.PORT;
app.use(cors())
app.use(express.json())


const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const JWKS = createRemoteJWKSet(
  new URL("http://localhost:3000/api/auth/jwks")
)

const verifyToken = async(req,res,next)=>{
  const authHeader = req?.headers.authorization;
  if(!authHeader){
    return res.status(401).json({ message :
      "Unauthorized" });
  }
 const token = authHeader.split(" ")[1];
  if(!token){
    return res.status(401).json({ message :
      "Unauthorized" });
  }
  try{
    const {payload} = await jwtVerify(token, JWKS)
    console.log(payload)
     next()
  }catch(error){
    return res.status(403).json({ message:
      "Forbidden" });
  }
 };

async function run() {
  try {
   await client.connect();
   
   const db = client.db("idea-vault")

   const ideaCollection = db.collection("idea-vault");
   const commentCollection = db.collection("comments");

  app.post("/comments", async (req, res) => {
  const commentData = req.body;
  const result = await commentCollection.insertOne(commentData);
  res.json(result);
});
app.get('/comments',async(req,res)=>{
    const result = await commentCollection.find().toArray();
    res.json(result);
   });
app.get("/comments/:userId", async (req, res) => {
  const {userId} = req.params;
  const result = await commentCollection
    .find({ userId: userId }).toArray()
   res.json(result);
});

app.delete("/comments/:userId", async (req, res) => {
  const {userId} = req.params;
  const result = await commentCollection
    .deleteOne({_id: new ObjectId(userId)})
   res.json(result);
});

app.get('/ideas',async(req,res)=>{
    const result = await ideaCollection.find().toArray();
    res.json(result);
   });


   app.post('/ideas',async(req,res)=>{
    const ideasData = req.body
    console.log(ideasData)
    const result =await ideaCollection.insertOne(ideasData)
    res.json(result)
   });
   //middleware
    app.get("/ideas/:id",verifyToken,
    async(req,res)=>{
    const {id} = req.params
    const result = await ideaCollection.findOne({_id: new ObjectId(id)})
    res.json(result)
 })
    app.patch("/ideas/:id",async(req,res)=>{
      const {id} = req.params
      const updatedData = req.body
      const result =await ideaCollection.updateOne(
        {_id: new ObjectId(id)},
        {$set: updatedData}
      )
      res.json(result)
    })
  app.patch("/comments/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const { commentText } = req.body;

    const result = await commentCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: { commentText },
      }
    );

    res.send(result);
  } catch (error) {
    console.log(error);
    res.status(500).send({ error: "Update failed" });
  }
});
    app.delete('/ideas/:id',async(req,res)=>{
      const {id} = req.params;
      const result = await ideaCollection.deleteOne({_id: new ObjectId(id)})
      res.json(result)
    })

   app.get('/trending-ideas', async (req, res) => {
   const result = await ideaCollection
    .find()
    .limit(6)
    .toArray();
      res.json(result);
});


    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/',(req,res)=>{
    res.send("server is running fine!")
})

app.listen(PORT,()=>{
    console.log(`server is running on port ${PORT}`)
})