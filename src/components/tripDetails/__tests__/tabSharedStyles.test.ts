import { tabSharedStyles } from "../tabSharedStyles";
import { RADIUS } from "../../../theme";

describe("tabSharedStyles", () => {
  it("should expose every style shared by the trip detail tabs", () => {
    expect(Object.keys(tabSharedStyles).sort()).toEqual([
      "addBtn",
      "addBtnText",
      "addBtnTop",
      "emptyState",
      "emptyText",
      "listIconWrap",
      "listInfo",
      "listItem",
      "listStripe",
      "listSub",
      "listTitle",
      "tabContent",
    ]);
  });

  it("should leave room under the tab content for the floating action button", () => {
    expect(tabSharedStyles.tabContent).toMatchObject({ paddingTop: 12, paddingBottom: 80 });
  });

  it("should build the list items on the shared card radius", () => {
    expect(tabSharedStyles.listItem).toMatchObject({
      borderRadius: RADIUS.card,
      borderWidth: 1,
      flexDirection: "row",
    });
  });
});
