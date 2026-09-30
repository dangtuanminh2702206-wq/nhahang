"use client";

import { useState, type KeyboardEvent } from "react";
import { AssetImage } from "@/components/asset-image";
import type { ResolvedMedia } from "@/data/media";
import { formatPrice, getCategoryLabel, menuCategories, menuCombos, restaurantMenu, type MenuCategoryId } from "@/data/restaurant";

type MenuTab = "combos" | MenuCategoryId;

const tabs: readonly { id: MenuTab; label: string }[] = [
  { id: "combos", label: "Combo" },
  ...menuCategories,
];

type MenuBrowserProps = {
  media: {
    dishes: Record<string, ResolvedMedia>;
    combos: Record<string, ResolvedMedia>;
  };
};

export function MenuBrowser({ media }: MenuBrowserProps) {
  const [activeTab, setActiveTab] = useState<MenuTab>("combos");
  const visibleItems = activeTab === "combos" ? [] : restaurantMenu.filter((item) => item.category === activeTab);

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = tabs.length - 1;
    else return;
    event.preventDefault();
    setActiveTab(tabs[nextIndex].id);
    document.getElementById(`menu-tab-${tabs[nextIndex].id}`)?.focus();
  }

  return (
    <section aria-label="Danh sách thực đơn" className="menu-browser">
      <div className="menu-tabs" role="tablist" aria-label="Nhóm thực đơn">
        {tabs.map((tab, index) => (
          <button key={tab.id} id={`menu-tab-${tab.id}`} type="button" role="tab" aria-selected={activeTab === tab.id} aria-controls="menu-panel" tabIndex={activeTab === tab.id ? 0 : -1} className={activeTab === tab.id ? "is-active" : ""} onClick={() => setActiveTab(tab.id)} onKeyDown={(event) => handleTabKeyDown(event, index)}>
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab === "combos" ? (
        <div className="combo-grid" id="menu-panel" role="tabpanel" aria-labelledby={`menu-tab-${activeTab}`} tabIndex={0}>
          {menuCombos.map((combo) => (
            <article className="combo-card" key={combo.code}>
              <AssetImage asset={media.combos[combo.code]} kind="combo" label={combo.name} sizes="(max-width: 704px) calc(100vw - 34px), (max-width: 1024px) 42vw, 220px" />
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
        <div className="menu-grid" id="menu-panel" role="tabpanel" aria-labelledby={`menu-tab-${activeTab}`} tabIndex={0}>
          {visibleItems.map((item) => (
            <article className="menu-card" key={item.code}>
              <AssetImage asset={media.dishes[item.code]} kind="dish" label={item.name} sizes="(max-width: 704px) calc(100vw - 58px), (max-width: 1024px) 44vw, 372px" />
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
