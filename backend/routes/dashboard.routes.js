const express = require("express");
const router = express.Router();

const User = require("../models/User");
const Worker = require("../models/Workers");
const Client = require("../models/Clients");
const JobRequest = require("../models/Job_Requests");
const Payment = require("../models/Payments");
const Service = require("../models/Services");

router.get("/stats", async (req, res) => {
  try {
    const [users, workers, clients, jobs, payments, services] = await Promise.all([
      User.find(),
      Worker.find(),
      Client.find(),
      JobRequest.find().sort({ requested_at: -1, _id: -1 }),
      Payment.find(),
      Service.find(),
    ]);

    const usersById = new Map(users.map((user) => [String(user._id), user]));
    const servicesById = new Map(services.map((service) => [String(service._id), service]));

    const completedRevenue = payments
      .filter((payment) => payment.payment_status === "completed")
      .reduce((sum, payment) => sum + (payment.amount || 0), 0);
    const pendingPayments = payments.filter((payment) => payment.payment_status === "pending");

    const pendingWorkers = workers
      .filter((worker) => worker.verification_status === "pending")
      .slice(0, 5)
      .map((worker) => {
        const user = usersById.get(String(worker.user_id));
        const service = servicesById.get(String(worker.service_id));

        return {
          id: worker._id,
          name: user?.name || "Unknown Worker",
          initials: initials(user?.name || "Worker"),
          role: `${service?.name || "General Service"} • ${worker.cnic || "CNIC pending"}`,
        };
      });

    const recentJobs = jobs.slice(0, 5).map((job) => {
      const client = usersById.get(String(job.client_id));
      const worker = usersById.get(String(job.worker_id));
      const service = servicesById.get(String(job.service_id));

      return {
        id: job._id,
        jobId: job.id,
        client: client?.name || "Unassigned client",
        worker: worker?.name || "Unassigned worker",
        initials: initials(client?.name || "Client"),
        category: service?.name || "General Service",
        location: job.location || "Location not provided",
        budget: job.suggested_price ? `Rs. ${job.suggested_price.toLocaleString()}` : "Not set",
        status: job.status || "pending",
      };
    });

    res.json({
      totals: {
        users: users.length,
        workers: workers.length,
        clients: clients.length,
        services: services.length,
        jobs: jobs.length,
        payments: payments.length,
        revenue: completedRevenue,
        pendingPayments: pendingPayments.length,
      },
      workers: {
        pending: workers.filter((worker) => worker.verification_status === "pending").length,
        approved: workers.filter((worker) => worker.verification_status === "approved").length,
        rejected: workers.filter((worker) => worker.verification_status === "rejected").length,
      },
      jobs: {
        pending: jobs.filter((job) => job.status === "pending").length,
        assigned: jobs.filter((job) => job.status === "assigned").length,
        inProgress: jobs.filter((job) => job.status === "in_progress").length,
        completed: jobs.filter((job) => job.status === "completed").length,
        cancelled: jobs.filter((job) => job.status === "cancelled").length,
      },
      payments: {
        pending: pendingPayments.length,
        completed: payments.filter((payment) => payment.payment_status === "completed").length,
        failed: payments.filter((payment) => payment.payment_status === "failed").length,
        refunded: payments.filter((payment) => payment.payment_status === "refunded").length,
      },
      chartData: buildJobChart(jobs),
      pendingWorkers,
      recentJobs,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function initials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function buildJobChart(jobs) {
  const days = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (5 - index));

    return {
      date,
      day: date.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase(),
      posted: 0,
      completed: 0,
    };
  });

  jobs.forEach((job) => {
    const requestedAt = job.requested_at ? new Date(job.requested_at) : null;
    const completedAt = job.completed_at ? new Date(job.completed_at) : null;

    days.forEach((day) => {
      const nextDay = new Date(day.date);
      nextDay.setDate(nextDay.getDate() + 1);

      if (requestedAt && requestedAt >= day.date && requestedAt < nextDay) {
        day.posted += 1;
      }

      if (completedAt && completedAt >= day.date && completedAt < nextDay) {
        day.completed += 1;
      }
    });
  });

  return days.map(({ day, posted, completed }) => ({ day, posted, completed }));
}

module.exports = router;
