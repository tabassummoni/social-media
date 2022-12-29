const express = require('express');
const cors = require('cors');
const port = process.env.PORT || 5000;
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();

app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.ombp0ui.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run(){
    try{
        const userCollection = client.db('social-media-data').collection('userData');
        const statusCollection = client.db('social-media-data').collection('allStatus');
        const loveCollection = client.db('social-media-data').collection('loveDetails');


        app.post('/userData', async (req, res) => {
            const email = req.body.email;
            const user = req.body;
            const query = { "email": email };
            const cursor = await userCollection.find(query).toArray();
            if (cursor.length > 0) {
                let result = { 'acknowledged': false, 'message': "This email is already registered in our system. Please login" }
                res.send(result);
            } else {
                const result = await userCollection.insertOne(user);
                res.send(result);
            }
        })
        app.get('/userDetails/:email', async (req, res) => {
            const email = req.params.email;
            const query = {
                "email": email
            };
            const cursor = userCollection.find(query);
            const user = await cursor.toArray();
            res.send(user);
        })


        app.post('/allStatus' , async(req,res) => {
            const status = req.body;
            status.likeCount = 0
            status.createdAt = new Date();
            status.updatedAt = new Date();
            const result = await statusCollection.insertOne(status);
            res.send(result);
        })


        app.get('/mediaDetails/:email' , async(req,res) => {
            
            const email = req.params.email;
            const aggregateRules = [
                {
                    $lookup:
                    {
                        from: 'loveDetails',
                        localField: '_id',
                        foreignField: 'statusID',
                        as: 'loveDetails',
                        // let: { userEmail: '$userEmail' },
                        pipeline: [
                        {
                            $match: {
                            $expr: {
                                $and: [
                                // { $eq: ['$CompanyID', '$$CompanyID'] },
                                { $eq: ['$userEmail', email] },
                                ]
                            }
                            }
                        }
                        ]
                    }

                },
                {
                    $lookup:
                    {
                        from: 'userData',
                        localField: 'userEmail',
                        foreignField: 'email',
                        as: 'userData'
                    }
                },
                {
                    $sort: {
                        "likeCount": -1
                    }
                },
                {  $unwind: { path: '$loveDetails', preserveNullAndEmptyArrays: true } },
                {  $unwind: { path: '$userData', preserveNullAndEmptyArrays: true } }
            ];
            const cursor = statusCollection.aggregate(aggregateRules);
            const mediaDetails = await cursor.toArray();
            res.send(mediaDetails);
        })

        app.get('/mediaDashboard/:email' , async(req,res) => {
            
            const email = req.params.email;
            const aggregateRules = [
                {
                    $lookup:
                    {
                        from: 'loveDetails',
                        localField: '_id',
                        foreignField: 'statusID',
                        as: 'loveDetails',
                        // let: { userEmail: '$userEmail' },
                        pipeline: [
                        {
                            $match: {
                            $expr: {
                                $and: [
                                // { $eq: ['$CompanyID', '$$CompanyID'] },
                                { $eq: ['$userEmail', email] },
                                ]
                            }
                            }
                        }
                        ]
                    }

                },
                {
                    $lookup:
                    {
                        from: 'userData',
                        localField: 'userEmail',
                        foreignField: 'email',
                        as: 'userData'
                    }
                },
                {
                    $sort: {
                        "updatedAt": -1
                    }
                },
                { 
                    $limit : 3 
                },
                {  $unwind: { path: '$loveDetails', preserveNullAndEmptyArrays: true } },
                {  $unwind: { path: '$userData', preserveNullAndEmptyArrays: true } }
            ];
            const cursor = statusCollection.aggregate(aggregateRules);
            const mediaDetails = await cursor.toArray();
            res.send(mediaDetails);
        })


        app.post('/love' , async(req,res) => {
            const request = req.body;
            request.statusID = ObjectId(request.statusID)
            // request.userEmail = request.userEmail
            request.createdAt = new Date();

            const aggregateRules = [
                { $match: { userEmail: request.userEmail, statusID: request.statusID } }
            ];
            const cursor = loveCollection.aggregate(aggregateRules);
            const loveDetails = await cursor.toArray();

            if(loveDetails.length > 0){

                const deleteData = await loveCollection.deleteMany({ userEmail: request.userEmail, statusID: request.statusID })
                if(deleteData.acknowledged){
                    const result = await statusCollection.findOneAndUpdate({_id :ObjectId(request.statusID)}, {$inc : {'likeCount' : -1}, "$set": { "updatedAt" : new Date()}})
                }
                const result = {
                    "acknowledged": true,
                    "message": "Already in love list"
                }
                res.send(result);
            }else{
                
                const result = await statusCollection.findOneAndUpdate({_id :ObjectId(request.statusID)}, {$inc : {'likeCount' : 1}, "$set": { "updatedAt" : new Date()}})
                const result1 = await loveCollection.insertOne(request);
                res.send(result1);
            }
        })
    }
finally {

    }
}
run().catch(err => console.error(err));


app.get('/', async (req, res) => {
    res.send('server is running ')
})
app.listen(port, () => console.log("running"));
