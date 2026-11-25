import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
export default class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean; attempt: number }
> {
  state = { failed: false, attempt: 0 };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    if (__DEV__) console.error(error, info.componentStack);
    else console.error("allexi_render_failed");
  }
  render() {
    if (!this.state.failed)
      return (
        <React.Fragment key={this.state.attempt}>
          {this.props.children}
        </React.Fragment>
      );
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          padding: 32,
          gap: 20,
          backgroundColor: "#FBF9F5",
        }}
      >
        <Text
          accessibilityRole="header"
          style={{ fontSize: 28, color: "#1E3A2F" }}
        >
          Let’s reopen your Bible.
        </Text>
        <Text style={{ fontSize: 16, lineHeight: 25, color: "#72796F" }}>
          Something interrupted the app. Your saved study data will be kept when
          you retry.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            this.setState(({ attempt }) => ({
              failed: false,
              attempt: attempt + 1,
            }))
          }
          style={{ padding: 18, borderRadius: 6, backgroundColor: "#1E3A2F" }}
        >
          <Text style={{ color: "#FFFFFF", textAlign: "center", fontSize: 16 }}>
            Try again
          </Text>
        </Pressable>
      </View>
    );
  }
}
