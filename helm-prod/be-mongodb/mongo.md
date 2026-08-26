# Reffered documentations: 
https://www.mongodb.com/developer/products/mongodb/mongodb-with-kubernetes/
https://aws.amazon.com/blogs/storage/persistent-storage-for-kubernetes/

# Tasks to do after first time installation of this chart
1. Create secret named mongodb-keyfile <br>
```
openssl rand -base64 756 > mongodb-keyfile
kubectl create secret generic mongodb-keyfile --from-file=mongodb-keyfile --namespace mongodb
```

2. Apply taint on db-node <br>
```
kubectl taint nodes <node-id> db-node=true:NoSchedule
```

3. Initiate/configure mongodb replicas <br>
```
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "mongo-0.mongo.mongodb.svc.cluster.local:27017", priority: 2 },
    { _id: 1, host: "mongo-1.mongo.mongodb.svc.cluster.local:27017", priority: 1 },
    { _id: 2, host: "mongo-2.mongo.mongodb.svc.cluster.local:27017", priority: 1 }
  ]
})
```

4. Use this mongoURI for connecting to backend <br>
```
mongodb://<username>:<pass>@stg-mongo-0.stg-mongo.mongodb.svc.cluster.local:27017,stg-mongo-1.stg-mongo.mongodb.svc.cluster.local:27017,stg-mongo-2.stg-mongo.mongodb.svc.cluster.local:27017/zikhara-prod
```

5. To take mongodb restore with gzip and archive format
```
mongorestore --host="rs0/stg-mongo-0.stg-mongo.mongodb.svc.cluster.local:27017" \
  --password=<your_password> \
  --username=<your_username> \
   --authenticationDatabase=admin \
  --port=27017 \
  --gzip \
  --archive=YYYY-MM-DDUTCHH:MM:SS.gz \
  --db=zikhara-prod
```

6. Create strong password with following commnad
```
echo "zikharaproddbhashedpass" | base64
```

7. To create root user
```
db.createUser(
    {
      user: "admin",
      pwd: "<pass>",
      roles: [ { role: "root", db: "admin" } ]
    }
)
OR

db.createUser({
  user: "ujwal",
  pwd: "ujwal123",
  roles: [
    { role: "read", db: "zikhara-prod" }
  ]
})
```

8. To create new users
```
db.createUser(
  {
    user: "maulika",
    pwd: "QXNkQDEyMzQ1Cg==",
    roles: [
      { role: "dbAdminAnyDatabase", db: "admin" },
      { role: "readWriteAnyDatabase", db: "admin"}
    ]
  } 
)


db.createUser(
  {
    user: "ruttika",
    pwd: "ruttika@12345",
    roles: [
      { role: "readWrite", db: "zikhara-preprod" },
    ]
  }
)
```

9. Creating secrets for the mongodb auth
```
kubectl create secret generic mongodb-admin-creds \
  --from-literal=username=admin \
  --from-literal=password=securePassword
```
db.createUser(
    {
      user: "user", // Replace with your desired username
      pwd: "", // Replace with a strong password
      roles: [ { role: "root", db: "admin" } ]
    }
)

