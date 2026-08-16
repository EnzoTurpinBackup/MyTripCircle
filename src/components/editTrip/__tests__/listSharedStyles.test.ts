import { listSharedStyles } from "../listSharedStyles";

describe("listSharedStyles", () => {
  it("should expose every style shared by the edit lists", () => {
    expect(Object.keys(listSharedStyles).sort()).toEqual([
      "actionBtn",
      "addBtn",
      "addBtnText",
      "content",
      "empty",
      "emptyText",
      "iconWrap",
      "info",
      "item",
      "list",
      "sectionLbl",
      "sectionRow",
      "stripe",
      "title",
    ]);
  });

  it("should lay the list items out as a bordered row clipping its stripe", () => {
    expect(listSharedStyles.item).toMatchObject({
      flexDirection: "row",
      borderWidth: 1,
      overflow: "hidden",
    });
  });

  it("should give the type stripe a fixed width", () => {
    expect(listSharedStyles.stripe).toMatchObject({ width: 5 });
  });

  it("should size the row action buttons as square tap targets", () => {
    expect(listSharedStyles.actionBtn).toMatchObject({ width: 38, height: 38 });
  });
});
