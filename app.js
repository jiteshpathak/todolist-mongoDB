const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");

const app = express();

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

mongoose.connect("mongodb+srv://admin-jitesh:test123@cluster0.mxp8py8.mongodb.net/", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const itemsSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
});

const Item = new mongoose.model("Item", itemsSchema);

const item1 = new Item({
  name: "Welcome to Todo List",
});
const item2 = new Item({
  name: "Click + to add new item",
});
const item3 = new Item({
  name: "Hit to delete item",
});

const defaultItems = [item1, item2, item3];

const listSchema = {
  name: String,
  items: [itemsSchema],
};

const List = new mongoose.model("List", listSchema);

app.get("/", function (req, res) {
  Item.find({})
    .then(function (foundItems) {
      if (foundItems.length === 0) {
        return Item.insertMany(defaultItems);
      } else {
        res.render("list", { listTitle: "Today", newListItems: foundItems });
        console.log("Items saved to DB");
      }
    })
    .catch(function (err) {
      console.log(err);
    });
});

app.post("/", function (req, res) {
  const itemName = req.body.newItem;
  const listTitle = req.body.list;

  const item = new Item({
    name: itemName,
  });

  if (listTitle === "Today") {
    item
      .save()
      .then(() => {
        res.redirect("/");
      })
      .catch((err) => {
        console.log("Error saving item:", err);
        res.status(500).send("Internal Server Error");
      });
  } else {
    List.findOne({ name: listTitle })
      .then((foundList) => {
        if (!foundList) {
          console.log("List not found");
          res.status(404).send("Not Found");
        } else {
          foundList.items.push(item);
          return foundList.save();
        }
      })
      .then(() => {
        console.log("Item added to the list and saved successfully");
        res.redirect("/" + listTitle);
      })
      .catch((err) => {
        console.log("Error adding item to the list:", err);
        res.status(500).send("Internal Server Error");
      });
  }
});

app.get("/work", function (req, res) {
  res.render("list", { listTitle: "Work List", newListItems: workItems });
});

app.post("/delete", function (req, res) {
  const checkedItemId = req.body.checkbox;
  const listName = req.body.listName;

  if (listName === "Today") {
    Item.findById(checkedItemId)
      .then((foundItem) => {
        if (foundItem) {
          return foundItem.deleteOne();
        } else {
          console.log("Item not found");
        }
      })
      .then(() => {
        console.log("Item deleted successfully");
        res.redirect("/");
      })
      .catch((err) => {
        console.log("Error deleting item:", err);
        res.status(500).send("Internal Server Error");
      });
  } else {
    // Use $pull to remove the item from the array in the List document
    List.updateOne(
      { name: listName },
      { $pull: { items: { _id: checkedItemId } } }
    )
      .then(() => {
        console.log("Item removed from the list successfully");
        res.redirect("/" + listName);
      })
      .catch((err) => {
        console.log("Error removing item from the list:", err);
        res.status(500).send("Internal Server Error");
      });
  }
});

app.get("/about", function (req, res) {
  res.render("about");
});

app.listen(3000, function () {
  console.log("Server started on port 3000");
});

app.get("/:customName", async (req, res) => {
  const customName = req.params.customName;

  try {
    const foundList = await List.findOne({ name: customName });

    if (!foundList) {
      console.log("Doesn't exist");

      // Create a new list and save it
      const list = new List({
        name: customName,
        items: defaultItems,
      });

      await list.save();
      console.log("New list created and saved");
      res.redirect("/" + customName);
    } else {
      console.log("Exists");
      // Perform actions if the list exists
      // For example, render the existing list
      res.render("list", {
        listTitle: foundList.name,
        newListItems: foundList.items,
      });
    }
  } catch (err) {
    console.log("Error:", err);
    res.status(500).send("Internal Server Error");
  }
});
