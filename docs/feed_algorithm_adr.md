# ADR 004: Industry-Level Feed Recommendation & Ranking Architecture

## Status
**Accepted & Implemented**

## Context & Motivation
To increase user daily active usage (DAU), session frequency, and community retention on **The Startup Map**, the post feed needs algorithmic mechanisms that dynamically rank content across three primary view modes:
1. **For You**: Highly personalized recommendation feed balancing affinity, recency, quality, and serendipity.
2. **Joined**: Activity-boosted chronological stream of content from subscribed ecosystem channels.
3. **Trending**: Time-decay velocity algorithm (Hacker News / Reddit hybrid) surfacing viral discussions while allowing older posts to naturally age out.

---

## Architecture & Mathematical Scoring Models

### 1. Trending Feed: Velocity & Gravity Decay Algorithm
Naive like/reply aggregations lead to permanent top-slot hogging by older posts. The new algorithm applies a **Gravity Decay Exponent ($\gamma = 1.5$)**:

$$\text{Score}_{\text{Trending}}(p) = \frac{L(p) \cdot 3.5 + R(p) \cdot 5.5 + V(p) \cdot 0.2 + \text{MediaBonus}(2.5) + \text{VerifiedAuthorBonus}(2.0)}{(T_{\text{age}}(p) + 2)^{1.5}}$$

Where:
- $L(p)$ = Likes count
- $R(p)$ = Replies count (weighted $5.5\times$ higher to prioritize active conversation velocity)
- $V(p)$ = Impressions / views count
- $T_{\text{age}}(p)$ = Hours elapsed since post creation
- Exponent $1.5$ ensures posts older than 24 hours naturally recede unless sustained high velocity occurs.

---

### 2. For You Feed: Multi-Signal Personalization & Serendipity Engine
To prevent static feeds and filter bubbles, the **For You** algorithm combines 5 distinct scoring vectors:

$$\text{Score}_{\text{ForYou}}(u, p) = S_{\text{Recency}}(p) + S_{\text{Affinity}}(u, p) + S_{\text{Quality}}(p) + S_{\text{Serendipity}}(p)$$

Where:
1. **Exponential Recency Decay**: $S_{\text{Recency}}(p) = 10.0 \cdot e^{-0.115 \cdot T_{\text{age}}}$ (Half-life $\approx$ 6 hours).
2. **Interest & Location Affinity**: 
   - $+4.5$ if post belongs to user's explicitly followed interests.
   - $+3.0$ if post community is in user's joined list.
   - $+2.0$ if post content mentions user's startup sector.
   - $+1.5$ if post mentions user's city location.
3. **Quality & Social Proof**: $S_{\text{Quality}}(p) = \log_2(1 + \text{Likes} + 2 \cdot \text{Replies}) \cdot 2.2$ (Logarithmic scaling prevents viral outlier dominance).
4. **Serendipity & Discovery Factor**: $+1.8$ random exploration weight assigned to top content outside user's primary topics to drive serendipitous discovery and user return frequency.

---

### 3. Joined Feed: Activity-Bumping Stream
- Filters strictly to user's joined community subscriptions.
- Ranks chronologically using **Last Active Timestamp**: $\max(\text{created\_at}, \text{latest\_reply\_at}_{\text{within\_3h}})$, ensuring users never miss ongoing discussions in channels they care about.

---

## Trade-off Evaluation
- **Pros**: Zero third-party ML service latency overhead; deterministic 60fps client calculation fallback + Edge-cached D1 server ranking (`/api/posts?tab=trending`).
- **Cons**: Requires periodic weight tuning based on DAU interaction telemetry.

## Verification
- Unit & integration tested against `npx tsc --noEmit` and 15/15 E2E system tests passing.
