//! Rate limiting helpers

use std::{num::NonZeroU32, time::Duration};

use governor::{clock::DefaultClock, state::InMemoryState, Quota, RateLimiter};

use crate::error::CrawlerError;

pub type SharedRateLimiter = RateLimiter<(), InMemoryState, DefaultClock>;

pub fn build_rate_limiter(rate_limit_per_15min: u32) -> Result<SharedRateLimiter, CrawlerError> {
    let non_zero = NonZeroU32::new(rate_limit_per_15min).ok_or_else(|| {
        CrawlerError::Config("rate_limit_per_15min must be greater than zero".to_string())
    })?;

    let quota = Quota::with_period(Duration::from_secs(900))
        .ok_or_else(|| CrawlerError::Config("invalid rate limit period".to_string()))?
        .allow_burst(non_zero);

    Ok(RateLimiter::direct(quota))
}
