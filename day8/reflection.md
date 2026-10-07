# Reflection

The most difficult concept in the course was separating a system's normal
traffic from its correctness-critical path. At first, I treated a ticket sale
like an ordinary shopping page: add a seat to a cart and check out. Working
through the popular-concert numbers showed why that is unsafe. Two hundred
thousand people can read the same availability snapshot, while only one person
can own a seat. I overcame this by identifying the database transaction as the
source of truth, then putting caching and a waiting room around it instead of
inside it. Writing the hold and payment flows as state transitions also made
expiry, retries, and duplicate payment callbacks easier to reason about.

Based on feedback, I would improve the capstone's operational detail next. The
first version explained how to stop double-booking, but it did not explain what
support staff see when a payment provider is slow, a hold expires, or a customer
is scanned twice. I added idempotency keys, reconciliation, audit records,
refund states, and measurable latency and recovery targets. These additions make
the design more useful than a diagram that only works when every dependency is
healthy.

Next I will learn how to implement a small version of this design with a
relational database, an event queue, and load tests. I especially want to
measure contention and queue fairness rather than assuming the architecture
will behave well under a real flash crowd.
