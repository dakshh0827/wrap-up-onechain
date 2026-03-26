module wrap_up::platform {
    use std::string::String;
    use one::event;
    use one::clock::{Self, Clock};

    // --- Objects ---
    public struct UserProfile has key {
        id: UID,
        owner: address,
        total_points: u64,
        claimed_points: u64,
    }

    public struct ResearchReport has key, store {
        id: UID,
        ipfs_hash: String,
        curator: address,
        timestamp: u64,
        is_ai_generated: bool,
    }

    // --- Events ---
    public struct ReportSubmittedEvent has copy, drop {
        report_id: one::object::ID,
        curator: address,
        ipfs_hash: String,
        is_ai_generated: bool,
    }

    // --- Functions ---
    public fun register_user(ctx: &mut TxContext) {
        let sender = tx_context::sender(ctx);
        let profile = UserProfile {
            id: object::new(ctx),
            owner: sender,
            total_points: 0,
            claimed_points: 0,
        };
        transfer::transfer(profile, sender);
    }

    public fun submit_ai_research(
        profile: &mut UserProfile, 
        ipfs_hash: String,
        clock: &Clock, 
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        assert!(profile.owner == sender, 1);

        let report = ResearchReport {
            id: object::new(ctx),
            ipfs_hash,
            curator: sender,
            timestamp: clock::timestamp_ms(clock),
            is_ai_generated: true,
        };

        profile.total_points = profile.total_points + 1;

        event::emit(ReportSubmittedEvent {
            report_id: object::id(&report),
            curator: sender,
            ipfs_hash,
            is_ai_generated: true,
        });

        transfer::public_share_object(report);
    }

    public fun claim_rewards(profile: &mut UserProfile, ctx: &mut TxContext) {
        let sender = tx_context::sender(ctx);
        assert!(profile.owner == sender, 1);
        let claimable = profile.total_points - profile.claimed_points;
        assert!(claimable > 0, 2); 
        profile.claimed_points = profile.total_points;
    }
}