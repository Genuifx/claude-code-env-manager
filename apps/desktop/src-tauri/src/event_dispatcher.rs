use crate::channel::{AttachedChannelInfo, ChannelKind, InteractiveOutputChunk, OutputChannel};
use crate::event_bus::SessionEventRecord;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};

pub struct EventDispatcher {
    channels_by_runtime: Mutex<HashMap<String, Vec<Arc<dyn OutputChannel>>>>,
}

impl Default for EventDispatcher {
    fn default() -> Self {
        Self {
            channels_by_runtime: Mutex::new(HashMap::new()),
        }
    }
}

impl EventDispatcher {
    pub fn attach_channel(
        &self,
        runtime_id: impl Into<String>,
        channel: Arc<dyn OutputChannel>,
    ) -> Result<(), String> {
        let runtime_id = runtime_id.into();
        let mut channels = self
            .channels_by_runtime
            .lock()
            .map_err(|_| "Failed to lock event dispatcher channels".to_string())?;

        let entry = channels.entry(runtime_id).or_default();
        let channel_kind = channel.channel_kind();
        entry.retain(|existing| existing.channel_kind() != channel_kind);
        entry.push(channel);
        Ok(())
    }

    pub fn detach_channel(
        &self,
        runtime_id: &str,
        channel_kind: &ChannelKind,
    ) -> Result<(), String> {
        let mut channels = self
            .channels_by_runtime
            .lock()
            .map_err(|_| "Failed to lock event dispatcher channels".to_string())?;
        if let Some(entry) = channels.get_mut(runtime_id) {
            entry.retain(|channel| channel.channel_kind() != *channel_kind);
            if entry.is_empty() {
                channels.remove(runtime_id);
            }
        }
        Ok(())
    }

    pub fn dispatch_event(&self, runtime_id: &str, event: &SessionEventRecord) {
        self.dispatch_to_channels(runtime_id, |channel| channel.send_event(event));
    }

    pub fn dispatch_interactive_output(&self, runtime_id: &str, chunk: &InteractiveOutputChunk) {
        self.dispatch_to_channels(runtime_id, |channel| channel.send_interactive_output(chunk));
    }

    pub fn list_channels(&self, runtime_id: &str) -> Vec<AttachedChannelInfo> {
        let Ok(channels) = self.channels_by_runtime.lock() else {
            return Vec::new();
        };

        channels
            .get(runtime_id)
            .into_iter()
            .flat_map(|entry| entry.iter())
            .filter(|channel| channel.is_connected())
            .map(|channel| AttachedChannelInfo {
                kind: channel.channel_kind(),
                connected_at: channel.connected_at(),
                label: channel.label(),
            })
            .collect()
    }

    fn dispatch_to_channels<F>(&self, runtime_id: &str, send: F)
    where
        F: Fn(&Arc<dyn OutputChannel>) -> Result<(), String>,
    {
        let channels = self.snapshot_channels(runtime_id);
        if channels.is_empty() {
            return;
        }

        let mut failed_kinds = Vec::new();
        for channel in channels {
            let kind = channel.channel_kind();
            if send(&channel).is_err() || !channel.is_connected() {
                failed_kinds.push(kind);
            }
        }

        if failed_kinds.is_empty() {
            return;
        }

        if let Ok(mut channels_by_runtime) = self.channels_by_runtime.lock() {
            if let Some(entry) = channels_by_runtime.get_mut(runtime_id) {
                entry.retain(|channel| !failed_kinds.contains(&channel.channel_kind()));
                if entry.is_empty() {
                    channels_by_runtime.remove(runtime_id);
                }
            }
        }
    }

    fn snapshot_channels(&self, runtime_id: &str) -> Vec<Arc<dyn OutputChannel>> {
        self.channels_by_runtime
            .lock()
            .ok()
            .and_then(|channels| channels.get(runtime_id).cloned())
            .unwrap_or_default()
    }
}
