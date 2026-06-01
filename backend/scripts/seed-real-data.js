require("dotenv").config();
const dns = require("dns");
dns.setServers((process.env.DNS_SERVERS || "8.8.8.8,1.1.1.1").split(","));

const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const AdminLog = require("../models/Admin_Logs");
const Client = require("../models/Clients");
const FavoriteWorker = require("../models/Favourite_Workers");
const JobRequest = require("../models/Job_Requests");
const Payment = require("../models/Payments");
const Prebooking = require("../models/Prebookings");
const PriceOffer = require("../models/Price_Offers");
const Review = require("../models/Reviews");
const Service = require("../models/Services");
const User = require("../models/User");
const Worker = require("../models/Workers");
const WorkerTracking = require("../models/Worker_Tracking");

const password = "admin12345";

const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);
const daysFromNow = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

async function upsertById(Model, id, data) {
  return Model.findOneAndUpdate({ id }, { $set: data }, { returnDocument: "after", upsert: true });
}

async function seed() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing in backend/.env");
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const hashedPassword = await bcrypt.hash(password, 10);

  const admin = await User.findOneAndUpdate(
    { email: "admin@ustadgo.pk" },
    {
      $set: {
        id: 1,
        name: "Ahmed Khan",
        email: "admin@ustadgo.pk",
        phone: "+92-300-1111111",
        attribute_name: 100,
        password: hashedPassword,
        role: "admin",
        created_at: daysAgo(90),
      },
    },
    { returnDocument: "after", upsert: true },
  );

  const clientUsers = await Promise.all([
    User.findOneAndUpdate(
      { email: "sara.ahmed@example.com" },
      {
        $set: {
          id: 2,
          name: "Sara Ahmed",
          email: "sara.ahmed@example.com",
          phone: "+92-300-2222222",
          attribute_name: 20,
          password: hashedPassword,
          role: "client",
          created_at: daysAgo(35),
        },
      },
      { returnDocument: "after", upsert: true },
    ),
    User.findOneAndUpdate(
      { email: "zaid.khan@example.com" },
      {
        $set: {
          id: 3,
          name: "Zaid Khan",
          email: "zaid.khan@example.com",
          phone: "+92-300-3333333",
          attribute_name: 21,
          password: hashedPassword,
          role: "client",
          created_at: daysAgo(28),
        },
      },
      { returnDocument: "after", upsert: true },
    ),
  ]);

  const workerUsers = await Promise.all([
    User.findOneAndUpdate(
      { email: "imran.sheikh@example.com" },
      {
        $set: {
          id: 4,
          name: "Imran Sheikh",
          email: "imran.sheikh@example.com",
          phone: "+92-300-4444444",
          attribute_name: 40,
          password: hashedPassword,
          role: "worker",
          created_at: daysAgo(70),
        },
      },
      { returnDocument: "after", upsert: true },
    ),
    User.findOneAndUpdate(
      { email: "asif.ali@example.com" },
      {
        $set: {
          id: 5,
          name: "Asif Ali",
          email: "asif.ali@example.com",
          phone: "+92-300-5555555",
          attribute_name: 41,
          password: hashedPassword,
          role: "worker",
          created_at: daysAgo(62),
        },
      },
      { returnDocument: "after", upsert: true },
    ),
    User.findOneAndUpdate(
      { email: "bilal.ahmed@example.com" },
      {
        $set: {
          id: 6,
          name: "Bilal Ahmed",
          email: "bilal.ahmed@example.com",
          phone: "+92-300-6666666",
          attribute_name: 42,
          password: hashedPassword,
          role: "worker",
          created_at: daysAgo(55),
        },
      },
      { returnDocument: "after", upsert: true },
    ),
  ]);

  const services = await Promise.all([
    upsertById(Service, 1, {
      id: 1,
      name: "Electrical Repair",
      category_type: "Electrical",
      description: "Wiring, switchboard repair, power fault diagnosis, and fixture installation.",
      icon_url: "https://ustadgo.pk/icons/electrical.svg",
    }),
    upsertById(Service, 2, {
      id: 2,
      name: "Plumbing",
      category_type: "Plumbing",
      description: "Leak repair, drain cleaning, fixture installation, and water line service.",
      icon_url: "https://ustadgo.pk/icons/plumbing.svg",
    }),
    upsertById(Service, 3, {
      id: 3,
      name: "AC Repair",
      category_type: "HVAC",
      description: "AC servicing, cooling issue diagnosis, gas refill, and maintenance.",
      icon_url: "https://ustadgo.pk/icons/ac-repair.svg",
    }),
    upsertById(Service, 4, {
      id: 4,
      name: "Carpentry & Woodwork",
      category_type: "Carpentry",
      description: "Furniture assembly, door locks repair, cabinet restoration, and general woodwork.",
      icon_url: "https://ustadgo.pk/icons/carpentry.svg",
    }),
    upsertById(Service, 5, {
      id: 5,
      name: "Painting & Decorating",
      category_type: "Painting",
      description: "Interior/exterior wall painting, leakage stains covering, and wallpaper installation.",
      icon_url: "https://ustadgo.pk/icons/painting.svg",
    }),
    upsertById(Service, 6, {
      id: 6,
      name: "Deep Cleaning",
      category_type: "Cleaning",
      description: "Kitchen and washroom deep cleaning, sofa washing, and carpet vacuuming.",
      icon_url: "https://ustadgo.pk/icons/cleaning.svg",
    }),
    upsertById(Service, 7, {
      id: 7,
      name: "Gardening & Lawn Care",
      category_type: "Gardening",
      description: "Lawn mowing, tree trimming, plants weeding, and garden designing.",
      icon_url: "https://ustadgo.pk/icons/gardening.svg",
    }),
    upsertById(Service, 8, {
      id: 8,
      name: "Appliance Repair",
      category_type: "Appliances",
      description: "Washing machine, refrigerator, microwave oven, and water dispenser repair.",
      icon_url: "https://ustadgo.pk/icons/appliances.svg",
    }),
    upsertById(Service, 9, {
      id: 9,
      name: "Masonry & Tile Work",
      category_type: "Masonry",
      description: "Bricklaying, wall plastering, tile repair, and concrete structures restoration.",
      icon_url: "https://ustadgo.pk/icons/masonry.svg",
    }),
    upsertById(Service, 10, {
      id: 10,
      name: "Welding & Fabrication",
      category_type: "Welding",
      description: "Gate repair, window grills, structural welding, and general steel repairs.",
      icon_url: "https://ustadgo.pk/icons/welding.svg",
    }),
    upsertById(Service, 11, {
      id: 11,
      name: "Car & Bike Mechanic",
      category_type: "Automotive",
      description: "Spark plug replacement, oil change, brake tuning, and roadside troubleshooting.",
      icon_url: "https://ustadgo.pk/icons/automotive.svg",
    }),
    upsertById(Service, 12, {
      id: 12,
      name: "Locksmith & Key Services",
      category_type: "Security",
      description: "Emergency door opening, key duplication, smart lock installation, and latch repair.",
      icon_url: "https://ustadgo.pk/icons/locksmith.svg",
    }),
  ]);

  const clients = await Promise.all([
    upsertById(Client, 1, {
      id: 1,
      user_id: clientUsers[0]._id,
      address: "Office #711, Mashriq Center, near National Stadium Road",
      city: "Karachi",
      created_at: daysAgo(35),
    }),
    upsertById(Client, 2, {
      id: 2,
      user_id: clientUsers[1]._id,
      address: "2 Raja Ghazanfar Ali Road, MBL Panorama Karachi Cantonment",
      city: "Karachi",
      created_at: daysAgo(28),
    }),
  ]);

  const workers = await Promise.all([
    upsertById(Worker, 1, {
      id: 1,
      user_id: workerUsers[0]._id,
      service_id: services[0]._id,
      cnic: "42101-1234567-1",
      skills: "Residential wiring, DB panel repair, ceiling fan installation",
      profile_picture: "https://ustadgo.pk/workers/imran-sheikh.jpg",
      verification_status: "approved",
      total_jobs: 128,
      reliability_score: 96.5,
      rating: 4.8,
    }),
    upsertById(Worker, 2, {
      id: 2,
      user_id: workerUsers[1]._id,
      service_id: services[1]._id,
      cnic: "42101-7654321-2",
      skills: "Leak repair, bathroom fittings, water motor lines",
      profile_picture: "https://ustadgo.pk/workers/asif-ali.jpg",
      verification_status: "approved",
      total_jobs: 91,
      reliability_score: 93.2,
      rating: 4.6,
    }),
    upsertById(Worker, 3, {
      id: 3,
      user_id: workerUsers[2]._id,
      service_id: services[2]._id,
      cnic: "42101-2468135-3",
      skills: "Split AC service, gas refill, compressor diagnostics",
      profile_picture: "https://ustadgo.pk/workers/bilal-ahmed.jpg",
      verification_status: "approved",
      total_jobs: 77,
      reliability_score: 91.4,
      rating: 4.5,
    }),
  ]);

  const prebookings = await Promise.all([
    upsertById(Prebooking, 1, {
      id: 1,
      client_id: clientUsers[0]._id,
      worker_id: workerUsers[0]._id,
      service_id: services[0]._id,
      scheduled_at: daysFromNow(1),
      status: "confirmed",
      notes: "Client requested visit after office hours.",
      reliability_score: 96.5,
      created_at: daysAgo(2),
    }),
    upsertById(Prebooking, 2, {
      id: 2,
      client_id: clientUsers[1]._id,
      worker_id: workerUsers[1]._id,
      service_id: services[1]._id,
      scheduled_at: daysFromNow(3),
      status: "pending",
      notes: "Inspect water leakage before quote confirmation.",
      reliability_score: 93.2,
      created_at: daysAgo(1),
    }),
  ]);

  const jobs = await Promise.all([
    JobRequest.findOneAndUpdate(
      { id: "#JOB-2001" },
      {
        $set: {
          id: "#JOB-2001",
          client_id: clientUsers[0]._id,
          worker_id: workerUsers[0]._id,
          service_id: services[0]._id,
          prebooking_id: prebookings[0]._id,
          description: "Office switchboard has intermittent power loss and needs inspection.",
          video_url: "https://ustadgo.pk/jobs/job-2001.mp4",
          longitude: 67.0835,
          latitude: 24.9065,
          location: "Gulshan-e-Iqbal, Karachi",
          status: "assigned",
          suggested_price: 2500,
          offer_status: "accepted",
          requested_at: daysAgo(1),
          completed_at: null,
        },
      },
      { returnDocument: "after", upsert: true },
    ),
    JobRequest.findOneAndUpdate(
      { id: "#JOB-2002" },
      {
        $set: {
          id: "#JOB-2002",
          client_id: clientUsers[1]._id,
          worker_id: workerUsers[1]._id,
          service_id: services[1]._id,
          prebooking_id: prebookings[1]._id,
          description: "Leak under washroom sink and low water pressure in pantry.",
          video_url: "https://ustadgo.pk/jobs/job-2002.mp4",
          longitude: 67.0308,
          latitude: 24.8138,
          location: "Karachi Cantonment, Karachi",
          status: "in_progress",
          suggested_price: 1800,
          offer_status: "accepted",
          requested_at: daysAgo(0.5),
          completed_at: null,
        },
      },
      { returnDocument: "after", upsert: true },
    ),
    JobRequest.findOneAndUpdate(
      { id: "#JOB-2003" },
      {
        $set: {
          id: "#JOB-2003",
          client_id: clientUsers[0]._id,
          worker_id: workerUsers[2]._id,
          service_id: services[2]._id,
          prebooking_id: null,
          description: "AC cooling drops after 20 minutes and outdoor unit makes noise.",
          video_url: "https://ustadgo.pk/jobs/job-2003.mp4",
          longitude: 67.0643,
          latitude: 24.7936,
          location: "DHA Phase 6, Karachi",
          status: "completed",
          suggested_price: 4500,
          offer_status: "accepted",
          requested_at: daysAgo(5),
          completed_at: daysAgo(4),
        },
      },
      { returnDocument: "after", upsert: true },
    ),
  ]);

  const offers = await Promise.all([
    upsertById(PriceOffer, 1, {
      id: 1,
      job_id: jobs[0]._id,
      worker_id: workerUsers[0]._id,
      offered_price: 2400,
      status: "accepted",
      message: "I can inspect and repair the switchboard today.",
      offered_at: daysAgo(1),
      responded_at: daysAgo(0.9),
    }),
    upsertById(PriceOffer, 2, {
      id: 2,
      job_id: jobs[1]._id,
      worker_id: workerUsers[1]._id,
      offered_price: 1750,
      status: "accepted",
      message: "Leak repair and pressure check included.",
      offered_at: daysAgo(0.5),
      responded_at: daysAgo(0.4),
    }),
    upsertById(PriceOffer, 3, {
      id: 3,
      job_id: jobs[2]._id,
      worker_id: workerUsers[2]._id,
      offered_price: 4300,
      status: "accepted",
      message: "Includes service, gas pressure check, and outdoor unit inspection.",
      offered_at: daysAgo(5),
      responded_at: daysAgo(4.9),
    }),
  ]);

  await Promise.all([
    upsertById(Payment, 1, {
      id: 1,
      job_id: jobs[0]._id,
      offer_id: offers[0]._id,
      client_id: clientUsers[0]._id,
      worker_id: workerUsers[0]._id,
      amount: 2400,
      payment_status: "pending",
      paid_at: null,
      payment_method: "cash",
    }),
    upsertById(Payment, 2, {
      id: 2,
      job_id: jobs[1]._id,
      offer_id: offers[1]._id,
      client_id: clientUsers[1]._id,
      worker_id: workerUsers[1]._id,
      amount: 1750,
      payment_status: "pending",
      paid_at: null,
      payment_method: "online",
    }),
    upsertById(Payment, 3, {
      id: 3,
      job_id: jobs[2]._id,
      offer_id: offers[2]._id,
      client_id: clientUsers[0]._id,
      worker_id: workerUsers[2]._id,
      amount: 4300,
      payment_status: "completed",
      paid_at: daysAgo(4),
      payment_method: "card",
    }),
  ]);

  await Promise.all([
    upsertById(Review, 1, {
      id: 1,
      job_id: jobs[2]._id,
      client_id: clientUsers[0]._id,
      worker_id: workerUsers[2]._id,
      comment: "Professional AC service and clear explanation of the issue.",
      rating: 5,
      created_at: daysAgo(4),
    }),
    upsertById(Review, 2, {
      id: 2,
      job_id: jobs[0]._id,
      client_id: clientUsers[0]._id,
      worker_id: workerUsers[0]._id,
      comment: "Arrived quickly and explained repair options.",
      rating: 4,
      created_at: daysAgo(0.8),
    }),
  ]);

  await Promise.all([
    upsertById(FavoriteWorker, 1, {
      id: 1,
      client_id: clientUsers[0]._id,
      worker_id: workerUsers[0]._id,
      created_at: daysAgo(10),
    }),
    upsertById(FavoriteWorker, 2, {
      id: 2,
      client_id: clientUsers[1]._id,
      worker_id: workerUsers[1]._id,
      created_at: daysAgo(7),
    }),
  ]);

  await Promise.all([
    upsertById(WorkerTracking, 1, {
      id: 1,
      worker_id: workerUsers[0]._id,
      job_id: jobs[0]._id,
      latitude: 24.9065,
      longitude: 67.0835,
      timestamp: new Date(),
    }),
    upsertById(WorkerTracking, 2, {
      id: 2,
      worker_id: workerUsers[1]._id,
      job_id: jobs[1]._id,
      latitude: 24.8138,
      longitude: 67.0308,
      timestamp: new Date(),
    }),
    upsertById(WorkerTracking, 3, {
      id: 3,
      worker_id: workerUsers[2]._id,
      job_id: jobs[2]._id,
      latitude: 24.7936,
      longitude: 67.0643,
      timestamp: daysAgo(4),
    }),
  ]);

  await Promise.all([
    upsertById(AdminLog, 1, {
      id: 1,
      admin_id: admin._id,
      action: "Approved worker verification",
      target_id: workers[0].id,
      target_table: "workers",
      created_at: daysAgo(30),
    }),
    upsertById(AdminLog, 2, {
      id: 2,
      admin_id: admin._id,
      action: "Reviewed active job assignment",
      target_id: 2001,
      target_table: "job_requests",
      created_at: daysAgo(1),
    }),
    upsertById(AdminLog, 3, {
      id: 3,
      admin_id: admin._id,
      action: "Created service category",
      target_id: services[2].id,
      target_table: "services",
      created_at: daysAgo(20),
    }),
  ]);

  const counts = await Promise.all([
    User.countDocuments(),
    Service.countDocuments(),
    Worker.countDocuments(),
    Client.countDocuments(),
    JobRequest.countDocuments(),
    Prebooking.countDocuments(),
    PriceOffer.countDocuments(),
    Payment.countDocuments(),
    Review.countDocuments(),
    FavoriteWorker.countDocuments(),
    WorkerTracking.countDocuments(),
    AdminLog.countDocuments(),
  ]);

  const names = [
    "users",
    "services",
    "workers",
    "clients",
    "job_requests",
    "prebookings",
    "price_offers",
    "payments",
    "reviews",
    "favorite_workers",
    "worker_tracking",
    "admin_logs",
  ];

  console.log("Seeded realistic UstadGo data:");
  names.forEach((name, index) => console.log(`- ${name}: ${counts[index]}`));
  console.log("Admin login: admin@ustadgo.pk / admin12345");
}

seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
