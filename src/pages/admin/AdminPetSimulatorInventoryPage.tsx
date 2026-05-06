import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowDownUp, Diamond, PackagePlus, Pencil, Save, Trash2, X } from "lucide-react";
import { Button, Input, Select } from "../../components/ui";

type Rarity =
  | "Celestial"
  | "Superior"
  | "Divine"
  | "Exotic"
  | "Mythical"
  | "Legendary"
  | "Epic"
  | "Rare"
  | "Basic";

type Category =
  | "Buffs"
  | "Boosts"
  | "Flags"
  | "Gifts"
  | "Boxes"
  | "Keys"
  | "Vouchers"
  | "Charms"
  | "Tools"
  | "Miscellaneous"
  | "Event"
  | "Farming"
  | "Potions"
  | "Enchants"
  | "Eggs"
  | "Booths";

type SortMode = "none" | "highest" | "lowest";

interface InventoryItem {
  id: string;
  name: string;
  rarity: Rarity;
  category: Category;
  amount: number;
  worthInput: string;
  worthValue: number | null;
  createdAt: string;
}

interface EditDraft {
  name: string;
  rarity: Rarity;
  category: Category;
  amount: string;
  worthInput: string;
}

const storageKey = "admin:ps99-inventory";

const rarityOptions: Rarity[] = [
  "Celestial",
  "Superior",
  "Divine",
  "Exotic",
  "Mythical",
  "Legendary",
  "Epic",
  "Rare",
  "Basic",
];

const categoryOptions: Category[] = [
  "Buffs",
  "Boosts",
  "Flags",
  "Gifts",
  "Boxes",
  "Keys",
  "Vouchers",
  "Charms",
  "Tools",
  "Miscellaneous",
  "Event",
  "Farming",
  "Potions",
  "Enchants",
  "Eggs",
  "Booths",
];

const worthMultipliers: Record<string, number> = {
  k: 1_000,
  m: 1_000_000,
  b: 1_000_000_000,
};

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `ps99-${Date.now()}`;
}

function parseWorth(input: string) {
  const trimmed = input.trim();

  if (/^untradable$/i.test(trimmed)) {
    return { label: "Untradable", value: null, error: "" };
  }

  const match = trimmed.match(/^(\d+(?:\.\d+)?)([kmb])?$/i);

  if (!match) {
    return {
      label: trimmed,
      value: null,
      error: "Use a number like 745, 1.2k, 169k, 1.9m, or Untradable.",
    };
  }

  const amount = Number(match[1]);
  const suffix = match[2]?.toLowerCase() ?? "";
  const value = Math.round(amount * (worthMultipliers[suffix] ?? 1));

  return { label: trimmed, value, error: "" };
}

function formatDiamonds(value: number | null, original: string) {
  if (value === null) {
    return "Untradable";
  }

  return `${original} diamonds`;
}

function formatTotalWorth(item: InventoryItem) {
  if (item.worthValue === null) {
    return "Untradable";
  }

  return `${(item.amount * item.worthValue).toLocaleString()} diamonds`;
}

function normalizeAmount(value: unknown) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    return 1;
  }

  return value;
}

function loadInventory() {
  try {
    const saved = window.localStorage.getItem(storageKey);
    const parsedItems = saved ? (JSON.parse(saved) as Partial<InventoryItem>[]) : [];

    return parsedItems.map((item) => ({
      ...item,
      id: item.id ?? createId(),
      name: item.name ?? "Unnamed Item",
      rarity: item.rarity ?? "Celestial",
      category: item.category ?? "Miscellaneous",
      amount: normalizeAmount(item.amount),
      worthInput: item.worthInput ?? "Untradable",
      worthValue: typeof item.worthValue === "number" ? item.worthValue : null,
      createdAt: item.createdAt ?? new Date().toISOString(),
    })) as InventoryItem[];
  } catch {
    return [];
  }
}

export default function AdminPetSimulatorInventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>(loadInventory);
  const [name, setName] = useState("");
  const [rarity, setRarity] = useState<Rarity>("Celestial");
  const [worthInput, setWorthInput] = useState("");
  const [category, setCategory] = useState<Category>("Buffs");
  const [sortMode, setSortMode] = useState<SortMode>("none");
  const [formError, setFormError] = useState("");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [editError, setEditError] = useState("");

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(items));
  }, [items]);

  const sortedItems = useMemo(() => {
    const ordered = [...items];

    if (sortMode === "highest") {
      return ordered.sort((a, b) => (b.worthValue ?? -1) - (a.worthValue ?? -1));
    }

    if (sortMode === "lowest") {
      return ordered.sort((a, b) => (a.worthValue ?? Number.MAX_SAFE_INTEGER) - (b.worthValue ?? Number.MAX_SAFE_INTEGER));
    }

    return ordered;
  }, [items, sortMode]);

  const totalTradableWorth = items.reduce(
    (sum, item) => sum + (item.worthValue === null ? 0 : item.worthValue * item.amount),
    0,
  );
  const totalItemCount = items.reduce((sum, item) => sum + item.amount, 0);
  const untradableCount = items.filter((item) => item.worthValue === null).length;

  const handleAddItem = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const cleanName = name.trim();
    const parsedWorth = parseWorth(worthInput);

    if (!cleanName) {
      setFormError("Add an item name first.");
      return;
    }

    if (items.some((item) => item.name.toLowerCase() === cleanName.toLowerCase())) {
      setFormError("That item name is already in your inventory.");
      return;
    }

    if (parsedWorth.error) {
      setFormError(parsedWorth.error);
      return;
    }

    setItems((currentItems) => [
      {
        id: createId(),
        name: cleanName,
        rarity,
        category,
        amount: 1,
        worthInput: parsedWorth.label,
        worthValue: parsedWorth.value,
        createdAt: new Date().toISOString(),
      },
      ...currentItems,
    ]);
    setName("");
    setWorthInput("");
    setRarity("Celestial");
    setCategory("Buffs");
    setFormError("");
  };

  const handleStartEdit = (item: InventoryItem) => {
    setEditingItemId(item.id);
    setEditDraft({
      name: item.name,
      rarity: item.rarity,
      category: item.category,
      amount: String(item.amount),
      worthInput: item.worthInput,
    });
    setEditError("");
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setEditDraft(null);
    setEditError("");
  };

  const handleSaveEdit = (itemId: string) => {
    if (!editDraft) {
      return;
    }

    const cleanName = editDraft.name.trim();
    const cleanAmount = Number(editDraft.amount);
    const parsedWorth = parseWorth(editDraft.worthInput);

    if (!cleanName) {
      setEditError("Item name cannot be empty.");
      return;
    }

    if (!Number.isInteger(cleanAmount) || cleanAmount < 1) {
      setEditError("Amount must be a whole number of 1 or more.");
      return;
    }

    if (
      items.some(
        (item) => item.id !== itemId && item.name.toLowerCase() === cleanName.toLowerCase(),
      )
    ) {
      setEditError("Another item already uses that name.");
      return;
    }

    if (parsedWorth.error) {
      setEditError(parsedWorth.error);
      return;
    }

    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === itemId
          ? {
              ...item,
              name: cleanName,
              rarity: editDraft.rarity,
              category: editDraft.category,
              amount: cleanAmount,
              worthInput: parsedWorth.label,
              worthValue: parsedWorth.value,
            }
          : item,
      ),
    );
    handleCancelEdit();
  };

  return (
    <div className="admin-panel-stack ps99-inventory">
      <section className="admin-panel admin-panel--hero">
        <p className="admin-panel__eyebrow">Admin Only</p>
        <div className="admin-panel__title-row">
          <Diamond size={20} />
          <h2>Pet Simulator 99 Inventory</h2>
        </div>
        <p>
          Track item names, rarity, categories, and diamond worth for Roblox Pet Simulator 99.
        </p>
        <div className="admin-stat-grid">
          <div className="admin-stat-card">
            <span className="admin-stat-card__label">Items</span>
            <strong>{items.length}</strong>
            <span>Total tracked entries</span>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-card__label">Amount</span>
            <strong>{totalItemCount.toLocaleString()}</strong>
            <span>Total item quantity</span>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-card__label">Tradable Worth</span>
            <strong>{totalTradableWorth.toLocaleString()}</strong>
            <span>Diamonds across tradable items</span>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-card__label">Untradable</span>
            <strong>{untradableCount}</strong>
            <span>Items without diamond value</span>
          </div>
        </div>
      </section>

      <section className="admin-panel">
        <div className="admin-panel__header">
          <div className="admin-panel__title-row">
            <PackagePlus size={18} />
            <h2>Add Item</h2>
          </div>
        </div>
        <form className="admin-content-form" onSubmit={handleAddItem}>
          <div className="admin-content-form-grid admin-content-form-grid--four">
            <Input
              label="Name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Huge Hunter Potion"
            />
            <Select
              label="Rarity"
              value={rarity}
              onChange={(event) => setRarity(event.target.value as Rarity)}
              options={rarityOptions.map((option) => ({ value: option, label: option }))}
            />
            <Input
              label="Worth"
              value={worthInput}
              onChange={(event) => setWorthInput(event.target.value)}
              placeholder="169k, 1.9m, 745, Untradable"
            />
            <Select
              label="Category"
              value={category}
              onChange={(event) => setCategory(event.target.value as Category)}
              options={categoryOptions.map((option) => ({ value: option, label: option }))}
            />
          </div>
          {formError ? <p className="admin-inline-status is-error">{formError}</p> : null}
          <div className="admin-content-form-actions">
            <Button type="submit" icon={<PackagePlus size={16} />}>
              Add item
            </Button>
          </div>
        </form>
      </section>

      <section className="admin-panel">
        <div className="admin-task-toolbar">
          <div className="admin-task-toolbar__info">
            <div className="admin-panel__title-row">
              <ArrowDownUp size={18} />
              <h2>Inventory</h2>
            </div>
          </div>
          <Select
            aria-label="Sort by item worth"
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value as SortMode)}
            options={[
              { value: "none", label: "Newest first" },
              { value: "highest", label: "Worth: high to low" },
              { value: "lowest", label: "Worth: low to high" },
            ]}
          />
        </div>

        {sortedItems.length ? (
          <div className="ps99-inventory__table-wrap">
            <table className="ps99-inventory__table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Rarity</th>
                  <th>Worth</th>
                  <th>Amount</th>
                  <th>Total Worth</th>
                  <th>Category</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((item) => {
                  const isEditing = editingItemId === item.id && editDraft;

                  return (
                    <tr key={item.id} className={isEditing ? "is-editing" : undefined}>
                      <td>
                        {isEditing ? (
                          <input
                            className="ps99-inventory__field"
                            aria-label="Item name"
                            value={editDraft.name}
                            onChange={(event) =>
                              setEditDraft((currentDraft) =>
                                currentDraft
                                  ? { ...currentDraft, name: event.target.value }
                                  : currentDraft,
                              )
                            }
                          />
                        ) : (
                          <strong>{item.name}</strong>
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <select
                            className="ps99-inventory__field"
                            aria-label="Item rarity"
                            value={editDraft.rarity}
                            onChange={(event) =>
                              setEditDraft((currentDraft) =>
                                currentDraft
                                  ? { ...currentDraft, rarity: event.target.value as Rarity }
                                  : currentDraft,
                              )
                            }
                          >
                            {rarityOptions.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className={`ps99-rarity ps99-rarity--${item.rarity.toLowerCase()}`}>
                            {item.rarity}
                          </span>
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            className="ps99-inventory__field"
                            aria-label="Item worth"
                            value={editDraft.worthInput}
                            onChange={(event) =>
                              setEditDraft((currentDraft) =>
                                currentDraft
                                  ? { ...currentDraft, worthInput: event.target.value }
                                  : currentDraft,
                              )
                            }
                          />
                        ) : (
                          formatDiamonds(item.worthValue, item.worthInput)
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            className="ps99-inventory__field ps99-inventory__field--amount"
                            aria-label="Item amount"
                            type="number"
                            min="1"
                            step="1"
                            value={editDraft.amount}
                            onChange={(event) =>
                              setEditDraft((currentDraft) =>
                                currentDraft
                                  ? { ...currentDraft, amount: event.target.value }
                                  : currentDraft,
                              )
                            }
                          />
                        ) : (
                          item.amount.toLocaleString()
                        )}
                      </td>
                      <td>{formatTotalWorth(item)}</td>
                      <td>
                        {isEditing ? (
                          <select
                            className="ps99-inventory__field"
                            aria-label="Item category"
                            value={editDraft.category}
                            onChange={(event) =>
                              setEditDraft((currentDraft) =>
                                currentDraft
                                  ? { ...currentDraft, category: event.target.value as Category }
                                  : currentDraft,
                              )
                            }
                          >
                            {categoryOptions.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        ) : (
                          item.category
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <div className="ps99-inventory__actions">
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              icon={<Save size={15} />}
                              onClick={() => handleSaveEdit(item.id)}
                            >
                              Save
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              icon={<X size={15} />}
                              onClick={handleCancelEdit}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div className="ps99-inventory__actions">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              icon={<Pencil size={15} />}
                              onClick={() => handleStartEdit(item)}
                            >
                              Edit
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              icon={<Trash2 size={15} />}
                              aria-label={`Delete ${item.name}`}
                              onClick={() =>
                                setItems((currentItems) =>
                                  currentItems.filter((currentItem) => currentItem.id !== item.id),
                                )
                              }
                            >
                              Delete
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {editError ? <p className="admin-inline-status is-error ps99-inventory__edit-error">{editError}</p> : null}
          </div>
        ) : (
          <div className="admin-empty-state">No Pet Simulator 99 items are tracked yet.</div>
        )}
      </section>
    </div>
  );
}
