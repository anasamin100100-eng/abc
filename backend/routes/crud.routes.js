const express = require("express");
const auth = require("../middleware/auth");

function createCrudRouter(Model, options = {}) {
  const router = express.Router();
  const defaultSort = options.defaultSort || { id: 1, _id: 1 };

  router.get("/", async (req, res) => {
    try {
      const limit = Number(req.query.limit) || 0;
      const query = Model.find().sort(defaultSort);

      if (limit > 0) {
        query.limit(limit);
      }

      const records = await query;
      res.json(records);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get("/:id", async (req, res) => {
    try {
      const record = await findByRouteId(Model, req.params.id);

      if (!record) {
        return res.status(404).json({ error: `${Model.modelName} not found` });
      }

      res.json(record);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post("/", auth, async (req, res) => {
    try {
      const record = await Model.create(req.body);
      res.status(201).json(record);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  router.put("/:id", auth, async (req, res) => {
    try {
      const record = await updateByRouteId(Model, req.params.id, req.body);

      if (!record) {
        return res.status(404).json({ error: `${Model.modelName} not found` });
      }

      res.json(record);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  router.delete("/:id", auth, async (req, res) => {
    try {
      const record = await deleteByRouteId(Model, req.params.id);

      if (!record) {
        return res.status(404).json({ error: `${Model.modelName} not found` });
      }

      res.json({ deleted: true, record });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

function isMongoObjectId(value) {
  return /^[0-9a-fA-F]{24}$/.test(value);
}

function routeIdFilter(id) {
  if (isMongoObjectId(id)) {
    return { _id: id };
  }

  const numericId = Number(id);

  if (Number.isFinite(numericId) && String(numericId) === id) {
    return { id: numericId };
  }

  return { id };
}

function findByRouteId(Model, id) {
  return Model.findOne(routeIdFilter(id));
}

function updateByRouteId(Model, id, data) {
  return Model.findOneAndUpdate(routeIdFilter(id), { $set: data }, { returnDocument: "after" });
}

function deleteByRouteId(Model, id) {
  return Model.findOneAndDelete(routeIdFilter(id));
}

module.exports = createCrudRouter;
