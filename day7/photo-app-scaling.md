# SnapShare Scaling Plan

## Assumptions and estimates

- SnapShare has **10 million registered users**.
- **10% are active each day**, so the daily active user count is:
  `10,000,000 × 0.10 = 1,000,000 daily active users`.
- Each daily active user uploads **1 photo per day** and views **50 feed pages per day**.
- An original photo is **2 MB** and its thumbnail is **50 KB**. Using decimal units, one photo and thumbnail require `2.05 MB` of object storage.
- There are **86,400 seconds per day** and **365 days per year**.
- Average traffic is spread across the day. Peak traffic is estimated as **5× the average**.
- Each feed page request is treated as one feed view, even though one page may contain several photos.

### Traffic and storage calculations

| Metric | Calculation | Estimate |
|---|---|---:|
| Daily active users | `10,000,000 × 10%` | **1,000,000 users/day** |
| Photo uploads per day | `1,000,000 × 1` | **1,000,000 uploads/day** |
| Average uploads per second | `1,000,000 ÷ 86,400` | **11.6 uploads/second** |
| Feed views per day | `1,000,000 × 50` | **50,000,000 views/day** |
| Average feed views per second | `50,000,000 ÷ 86,400` | **579 views/second** |
| Peak feed views per second | `579 × 5` | **about 2,894 views/second** |
| Photos per year | `1,000,000 × 365` | **365,000,000 photos** |
| Photo storage per year | `365,000,000 × 2.05 MB` | **748,250,000 MB**, or **about 748.25 TB** |

This is about **748.25 TB** using decimal units: 748,250,000 MB ÷ 1,000 = 748,250 GB, and ÷ 1,000 = 748.25 TB. It excludes database metadata, multiple image sizes, backups, and replication, so production capacity planning would reserve additional space.

## Read/write pattern

SnapShare is **read-heavy**. The average of about 579 feed reads per second is much higher than about 12 uploads per second, and feed reads also have a peak of about 2,894 requests per second. The design should therefore prioritize low-latency reads with CDN delivery, caching, horizontally scalable app servers, and a read replica, while uploads can be handled asynchronously where possible.

## Why photos use object storage

Photo files should not be stored inside the relational database because large binary values would make database storage, backups, replication, and queries more expensive and less efficient. Original photos and thumbnails belong in durable object storage, while the database stores compact metadata such as the photo ID, owner, object-storage keys, caption, timestamps, and visibility settings.

## Architecture

```text
                           +-------------------+
                           |       Users       |
                           +---------+---------+
                                     |
                                     v
                           +-------------------+
                           | CDN (cached       |
                           | thumbnails/photos)|
                           +---------+---------+
                                     |
                                     v
                           +-------------------+
                           | Load balancer     |
                           +---------+---------+
                                     |
                   +-----------------+-----------------+
                   |                                   |
                   v                                   v
          +-------------------+               +-------------------+
          | App servers       |<------------->| Cache             |
          | (multiple copies) |               | (feed/metadata)   |
          +----+---------+----+               +-------------------+
               |         |
               |         +----------------------+
               v                                v
      +-------------------+             +-------------------+
      | Primary database  |             | Object storage    |
      | (metadata/writes) |             | (original photos  |
      +---------+---------+             | and thumbnails)   |
                |                       +-------------------+
                v
      +-------------------+
      | Read replica      |
      | (feed queries)    |
      +-------------------+

          App servers
               |
               v
      +-------------------+       +-------------------+
      | Queue             |------>| Thumbnail worker |
      | (image jobs)      |       +---------+---------+
      +-------------------+                 |
                                            v
                                  Object storage
```

### Component responsibilities

- **CDN:** Serves frequently requested photos and thumbnails from edge locations, reducing latency and origin traffic.
- **Load balancer:** Distributes incoming requests across healthy app servers and supports horizontal scaling.
- **App servers:** Authenticate users, validate requests, manage feed and upload logic, and remain stateless so more copies can be added.
- **Cache:** Keeps hot feed data and metadata in memory so repeated reads avoid unnecessary database work.
- **Primary database:** Stores durable user, follow, photo metadata, and upload records and handles writes.
- **Read replica:** Handles read-heavy feed and metadata queries without competing with primary database writes.
- **Object storage:** Stores the large original photo files and generated thumbnails durably and independently from database records.
- **Queue:** Buffers thumbnail jobs so uploading remains responsive and temporary worker slowdowns do not lose work.
- **Thumbnail worker:** Reads queued jobs, creates appropriately sized thumbnails, uploads them to object storage, and updates the photo metadata.

## Photo upload flow

1. The user selects a photo and sends an upload request to an app server.
2. The app server authenticates the user, checks the file type and size, creates a photo ID, and reserves an object-storage key.
3. The app server either accepts the file or returns a short-lived upload URL so the client can upload the original directly to object storage without routing the large file through the app server.
4. After the original is successfully stored, the app server writes the photo metadata and object key to the primary database.
5. The app server places a thumbnail job containing the photo ID and storage key onto the queue, then returns an upload-success response to the user.
6. A thumbnail worker takes the job, downloads or reads the original from object storage, creates the 50 KB thumbnail, and stores the thumbnail beside the original.
7. The worker updates the database with the thumbnail key and marks processing as complete; later feed requests read the metadata and use CDN URLs for delivery.
8. If a worker fails, the queue retries the job; a dead-letter queue can hold repeatedly failing jobs for investigation.

## Trade-offs

- **Direct-to-object-storage uploads vs app-server uploads:** Direct uploads reduce app-server bandwidth and improve scaling, but require signed URLs, upload-completion handling, and validation after the object arrives.
- **Read replica vs a single primary database:** A read replica increases feed capacity and protects writes from read traffic, but replication lag means a newly uploaded photo may not appear immediately in every feed.
- **Asynchronous thumbnails vs synchronous thumbnails:** Asynchronous processing makes uploads faster and absorbs bursts through the queue, but users may briefly see a processing placeholder and the system needs retries and monitoring.
- **Aggressive caching/CDN vs freshness and invalidation:** Caching lowers latency and cost, but changing or deleting a photo requires cache invalidation and may briefly serve an older version.
