jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"));

jest.mock("@expo/vector-icons", () => {
  const { Text } = require("react-native");
  return { Ionicons: (props: any) => <Text {...props} /> };
});

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { makeTrip } from "../../__tests__/voyagesTestUtils";
import MembersTab from "../MembersTab";
import type { Collaborator } from "../../../types";

const collaborator = (overrides: Partial<Collaborator> = {}): Collaborator =>
  ({
    userId: "u2",
    role: "viewer",
    joinedAt: new Date("2026-01-01T00:00:00.000Z"),
    permissions: { canEdit: false, canInvite: false, canDelete: false },
    ...overrides,
  }) as Collaborator;

const me = { id: "u1", name: "Enzo" };

const renderTab = (props: Partial<React.ComponentProps<typeof MembersTab>> = {}) =>
  render(
    <MembersTab
      trip={makeTrip()}
      user={me}
      isOwner
      collaboratorUsers={new Map()}
      {...props}
    />,
  );

describe("MembersTab — rôle de l'utilisateur courant", () => {
  it("should label the current user as organizer when they own the trip", () => {
    renderTab({ isOwner: true });

    expect(screen.getByText("Organizer")).toBeTruthy();
  });

  it("should label the current user as editor when their role is editor", () => {
    renderTab({ isOwner: false, userCollaborator: collaborator({ role: "editor" }) });

    expect(screen.getByText("Editor")).toBeTruthy();
  });

  it("should label the current user as viewer otherwise", () => {
    renderTab({ isOwner: false, userCollaborator: collaborator({ role: "viewer" }) });

    expect(screen.getByText("Viewer")).toBeTruthy();
  });

  it("should label the current user as viewer when they have no collaborator entry", () => {
    renderTab({ isOwner: false });

    expect(screen.getByText("Viewer")).toBeTruthy();
  });
});

describe("MembersTab — carte de l'utilisateur courant", () => {
  it("should show the user name", () => {
    renderTab();

    expect(screen.getByText("Enzo")).toBeTruthy();
  });

  it("should fall back to the generic label when the user has no name", () => {
    renderTab({ user: { id: "u1" } });

    expect(screen.getAllByText("You").length).toBeGreaterThan(0);
  });

  it("should show the first letter of the name as initial", () => {
    renderTab();

    expect(screen.getByText("E")).toBeTruthy();
  });

  it("should fall back to V as initial when there is no user at all", () => {
    renderTab({ user: null });

    expect(screen.getByText("V")).toBeTruthy();
  });

  it("should show the avatar photo instead of the initial when the user has one", () => {
    renderTab({ user: { id: "u1", name: "Enzo", avatar: "https://cdn/e.png" } });

    expect(screen.queryByText("E")).toBeNull();
  });

  it("should show who invited the current user", () => {
    renderTab({
      isOwner: false,
      userCollaborator: collaborator({ invitedBy: "u9" }),
      collaboratorUsers: new Map([["u9", { name: "Marya" }]]),
    });

    expect(screen.getByText("Invited by Marya")).toBeTruthy();
  });

  it("should fall back to the organizer label when the inviter is unknown", () => {
    renderTab({ isOwner: false, userCollaborator: collaborator({ invitedBy: "u9" }) });

    expect(screen.getByText("Invited by Organizer")).toBeTruthy();
  });

  it("should not show an inviter line for the owner", () => {
    renderTab({ isOwner: true, userCollaborator: collaborator({ invitedBy: "u9" }) });

    expect(screen.queryByText("Invited by Organizer")).toBeNull();
  });
});

describe("MembersTab — invitation", () => {
  it("should let the owner invite friends", () => {
    const onInvite = jest.fn();
    renderTab({ onInvite });

    fireEvent.press(screen.getByText("Invite Friends"));

    expect(onInvite).toHaveBeenCalledTimes(1);
  });

  it("should hide the invite button for a non-owner", () => {
    renderTab({ isOwner: false, onInvite: jest.fn() });

    expect(screen.queryByText("Invite Friends")).toBeNull();
  });

  it("should hide the invite button when no handler is provided", () => {
    renderTab();

    expect(screen.queryByText("Invite Friends")).toBeNull();
  });
});

describe("MembersTab — autres membres", () => {
  it("should list the other collaborators", () => {
    renderTab({
      trip: makeTrip({ collaborators: [collaborator({ userId: "u2" })] }),
      collaboratorUsers: new Map([["u2", { name: "Daryl" }]]),
    });

    expect(screen.getByText("Daryl")).toBeTruthy();
  });

  it("should exclude the current user from the collaborators list", () => {
    renderTab({
      trip: makeTrip({ collaborators: [collaborator({ userId: "u1" })] }),
      collaboratorUsers: new Map([["u1", { name: "Enzo" }]]),
    });

    expect(screen.getAllByText("Enzo")).toHaveLength(1);
  });

  it("should fall back to the user id when the collaborator is not resolved", () => {
    renderTab({ trip: makeTrip({ collaborators: [collaborator({ userId: "u2" })] }) });

    expect(screen.getByText("u2")).toBeTruthy();
  });

  it("should show a question mark when the collaborator has no displayable name", () => {
    renderTab({ trip: makeTrip({ collaborators: [collaborator({ userId: "" })] }) });

    expect(screen.getByText("?")).toBeTruthy();
  });

  it("should show the collaborator avatar instead of the initial when available", () => {
    renderTab({
      trip: makeTrip({ collaborators: [collaborator({ userId: "u2" })] }),
      collaboratorUsers: new Map([["u2", { name: "Daryl", avatar: "https://cdn/d.png" }]]),
    });

    expect(screen.queryByText("D")).toBeNull();
  });

  it("should label an editor collaborator", () => {
    renderTab({ trip: makeTrip({ collaborators: [collaborator({ userId: "u2", role: "editor" })] }) });

    expect(screen.getByText("Editor")).toBeTruthy();
  });

  it("should label a viewer collaborator", () => {
    renderTab({ trip: makeTrip({ collaborators: [collaborator({ userId: "u2", role: "viewer" })] }) });

    expect(screen.getAllByText("Viewer").length).toBeGreaterThan(0);
  });

  it("should name the collaborator inviter when it is resolved", () => {
    renderTab({
      trip: makeTrip({ collaborators: [collaborator({ userId: "u2", invitedBy: "u9" })] }),
      collaboratorUsers: new Map([["u9", { name: "Marya" }]]),
    });

    expect(screen.getByText("Invited by Marya")).toBeTruthy();
  });

  it("should show the organizer label when the collaborator was invited by the owner", () => {
    renderTab({
      trip: makeTrip({ ownerId: "u1", collaborators: [collaborator({ userId: "u2", invitedBy: "u1" })] }),
    });

    expect(screen.getByText("Invited by Organizer")).toBeTruthy();
  });

  it("should show the unknown label when the inviter is neither resolved nor the owner", () => {
    renderTab({
      trip: makeTrip({ ownerId: "u1", collaborators: [collaborator({ userId: "u2", invitedBy: "u9" })] }),
    });

    expect(screen.getByText("Invited by Unknown")).toBeTruthy();
  });

  it("should show no inviter line when the collaborator has none", () => {
    renderTab({ trip: makeTrip({ collaborators: [collaborator({ userId: "u2" })] }) });

    expect(screen.queryByText(/Invited by/)).toBeNull();
  });
});
