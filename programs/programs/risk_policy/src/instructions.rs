pub mod init_policy;
pub mod update_policy;

// Glob re-exports are required for Anchor's `#[program]` macro to find the
// auto-generated `__client_accounts_*` modules at the expected paths.
// Each module names its entry fn `handle` (not `handler`) to avoid an
// ambiguous-glob warning.
pub use init_policy::*;
pub use update_policy::*;
