use super::*;
use crate::event_bus::SessionEventPayload;

fn wecom_request() -> BindSessionToBotRequest {
    BindSessionToBotRequest {
        runtime_id: "runtime-abcdef".to_string(),
        platform: RemotePlatform::Wecom,
        peer_id: " group-1 ".to_string(),
        thread_id: None,
        bot_id: Some(" webot ".to_string()),
        task_title: Some("Ship binding".to_string()),
        task_summary: Some("Productionize metadata".to_string()),
        send_task_card: true,
    }
}

fn test_binding_info() -> BotBindingInfo {
    let binding_id = "binding".to_string();
    let task_id = "ccem-task-runtime".to_string();
    BotBindingInfo {
        binding_id: binding_id.clone(),
        runtime_id: "runtime-1".to_string(),
        task_id: task_id.clone(),
        platform: RemotePlatform::Weixin,
        peer_id: "peer-1".to_string(),
        thread_id: None,
        bot_id: None,
        task_title: "Task".to_string(),
        task_summary: None,
        send_task_card: true,
        correlation_marker: build_correlation_marker(&binding_id, &task_id),
        task_card_message_id: None,
        delivery_status: BotBindingDeliveryStatus::BoundOnly,
        last_delivery_error: None,
        delivered_at: None,
        connected_at: Utc::now(),
    }
}

#[test]
fn stable_binding_id_uses_wecom_bot_id_as_thread_identity() {
    let request = BindSessionToBotRequest {
        runtime_id: "runtime-abcdef".to_string(),
        platform: RemotePlatform::Wecom,
        peer_id: "user_a".to_string(),
        thread_id: Some("thread_should_not_win".to_string()),
        bot_id: Some("bot_123".to_string()),
        task_title: None,
        task_summary: None,
        send_task_card: true,
    };

    assert_eq!(
        stable_binding_id(&request),
        "botbind-runtime-abcdef-wecom-user_a-bot_123"
    );
}

#[test]
fn binding_record_normalizes_wecom_target_and_adds_delivery_metadata() {
    let manager = BotBindingManager::default();
    let (info, created) = manager
        .ensure_binding_record(wecom_request(), "runtime-abcdef")
        .expect("binding");

    assert!(created);
    assert_eq!(info.peer_id, "group-1");
    assert_eq!(info.bot_id.as_deref(), Some("webot"));
    assert_eq!(info.delivery_status, BotBindingDeliveryStatus::BoundOnly);
    assert_eq!(info.task_card_message_id, None);
    assert_eq!(info.last_delivery_error, None);
    assert!(info
        .correlation_marker
        .starts_with("ccem-bot-binding:botbind-runtime-abcdef-wecom-group-1-webot:"));
}

#[test]
fn wecom_binding_requires_target_bot_id() {
    let manager = BotBindingManager::default();
    let mut request = wecom_request();
    request.bot_id = None;

    let error = manager
        .ensure_binding_record(request, "runtime-abcdef")
        .expect_err("missing bot id should fail");

    assert_eq!(error, "bot_id is required for WeCom bot bindings");
}

#[test]
fn delivery_metadata_can_be_marked_delivered_or_failed() {
    let manager = BotBindingManager::default();
    let (info, _) = manager
        .ensure_binding_record(wecom_request(), "runtime-abcdef")
        .expect("binding");

    let pending = manager
        .mark_task_card_delivery_pending(&info.binding_id)
        .expect("pending update");
    assert_eq!(pending.delivery_status, BotBindingDeliveryStatus::Pending);

    let delivered = manager
        .mark_task_card_delivered(&info.binding_id, "msg-123")
        .expect("delivery update");
    assert_eq!(
        delivered.delivery_status,
        BotBindingDeliveryStatus::Delivered
    );
    assert_eq!(delivered.task_card_message_id.as_deref(), Some("msg-123"));
    assert_eq!(delivered.last_delivery_error, None);
    assert!(delivered.delivered_at.is_some());

    let failed = manager
        .mark_task_card_delivery_failed(&info.binding_id, "socket disconnected")
        .expect("failure update");
    assert_eq!(failed.delivery_status, BotBindingDeliveryStatus::Failed);
    assert_eq!(
        failed.last_delivery_error.as_deref(),
        Some("socket disconnected")
    );
}

#[test]
fn persisted_binding_state_restores_delivery_route_metadata() {
    let path = std::env::temp_dir().join(format!(
        "ccem-bot-binding-test-{}-{}.json",
        std::process::id(),
        Utc::now().timestamp_nanos_opt().unwrap_or_default()
    ));
    let _ = std::fs::remove_file(&path);

    let info = {
        let manager = BotBindingManager::with_storage_path_for_test(path.clone());
        let (info, _) = manager
            .ensure_binding_record(wecom_request(), "runtime-abcdef")
            .expect("binding");
        manager
            .mark_task_card_delivered(&info.binding_id, "msg-123")
            .expect("delivery update")
    };

    let restored = BotBindingManager::with_storage_path_for_test(path.clone());
    let restored_info = restored
        .find_binding_for_route(
            RemotePlatform::Wecom,
            Some("webot"),
            "group-1",
            Some(&info.task_id),
            None,
        )
        .expect("restored route");

    assert_eq!(restored_info.binding_id, info.binding_id);
    assert_eq!(
        restored_info.delivery_status,
        BotBindingDeliveryStatus::Delivered
    );
    assert_eq!(
        restored_info.task_card_message_id.as_deref(),
        Some("msg-123")
    );

    let _ = std::fs::remove_file(path);
}

#[test]
fn route_lookup_matches_quoted_task_or_correlation_marker() {
    let manager = BotBindingManager::default();
    let (info, _) = manager
        .ensure_binding_record(wecom_request(), "runtime-abcdef")
        .expect("binding");
    manager
        .mark_task_card_delivered(&info.binding_id, "msg-123")
        .expect("delivery update");

    let by_task = manager
        .find_binding_for_route(
            RemotePlatform::Wecom,
            Some("webot"),
            "group-1",
            Some(&info.task_id),
            None,
        )
        .expect("route by task id");
    assert_eq!(by_task.binding_id, info.binding_id);

    let by_marker = manager
        .find_binding_for_route(
            RemotePlatform::Wecom,
            Some("webot"),
            "group-1",
            None,
            Some(&info.correlation_marker),
        )
        .expect("route by correlation marker");
    assert_eq!(by_marker.binding_id, info.binding_id);

    let by_message_id = manager
        .find_binding_for_route(
            RemotePlatform::Wecom,
            Some("webot"),
            "group:group-1",
            None,
            Some("msg-123"),
        )
        .expect("route by delivered message id");
    assert_eq!(by_message_id.binding_id, info.binding_id);

    assert!(manager
        .find_binding_for_route(
            RemotePlatform::Wecom,
            Some("other-bot"),
            "group-1",
            Some(&info.task_id),
            None,
        )
        .is_none());
}

#[test]
fn assistant_chunks_become_event_updates() {
    let summary = formatting::summarize_payload(&SessionEventPayload::AssistantChunk {
        text: "working".to_string(),
    })
    .expect("summary");

    assert_eq!(summary.kind, BotBindingOutboxFrameKind::EventUpdate);
    assert_eq!(summary.title, "Assistant update");
    assert_eq!(summary.text, "working");
}

#[test]
fn inbound_prompt_carries_quoted_task_context() {
    let info = test_binding_info();

    let prompt = format_inbound_prompt(&info, "continue", Some("quoted-task"));
    assert!(prompt.contains("quoted_task_id: quoted-task"));
    assert!(prompt.contains("correlation_marker: ccem-bot-binding:binding:ccem-task-runtime"));
    assert!(prompt.contains("continue"));
}
