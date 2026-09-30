"use client";

import { useState } from "react";
import { MediaPlaceholder } from "@/components/media-placeholder";
import { formatPrice, getCategoryLabel, menuCategories, menuCombos, restaurantMenu, type MenuCategoryId } from "@/data/restaurant";

type MenuTab = "combos" | MenuCategoryId;

const tabs: readonly { id: MenuTab; label: string }[] = [
  { id: "combos", label: "Combo" },
  ...menuCategories,
];

export function MenuBrowser() {
  const [activeTab, setActiveTab] = useState<MenuTab>("combos");
  const visibleItems = activeTab === "combos" ? [] : restaurantMenu.filter((item) => item.category === activeTab);

  return (
    <section aria-label="Danh sách thực đơn" className="menu-browser">
      <div className="menu-tabs" role="tablist" aria-label="Nhóm thực đơn">
        {tabs.map((tab) => (
          <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} className={activeTab === tab.id ? "is-active" : ""} onClick={() => setActiveTab(tab.id)}>
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab === "combos" ? (
        <div className="combo-grid" role="tabpanel">
          {menuCombos.map((combo) => (
            <article className="combo-card" key={combo.code}>
              <MediaPlaceholder kind="combo" label={combo.name} />
              <div className="combo-content">
                <p className="meta-line">{combo.code} · Gợi ý {combo.guestCount} người</p>
                <h2>{combo.name}</h2>
                <p>{combo.description}</p>
                <strong className="price">{formatPrice(combo.price)}</strong>
                <details><summary>Xem thành phần</summary><ul>{combo.items.map((item) => <li key={item}>{item}</li>)}</ul></details>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="menu-grid" role="tabpanel">
          {visibleItems.map((item) => (
            <article className="menu-card" key={item.code}>
              <MediaPlaceholder kind="dish" label={item.name} />
              <div className="menu-card-copy">
                <p className="meta-line">{item.code} · {getCategoryLabel(item.category)}</p>
                <h2>{item.name}</h2>
                <p>{item.description}</p>
                <div className="menu-card-footer"><strong className="price">{formatPrice(item.price, item.fromPrice)}</strong><span className="availability">{item.available ? "Đang phục vụ" : "Tạm hết"}</span></div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
