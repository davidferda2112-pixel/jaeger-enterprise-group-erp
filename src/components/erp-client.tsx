"use client";

import {
  Activity,
  Archive,
  BarChart3,
  Boxes,
  Building2,
  ChevronLeft,
  ClipboardList,
  CreditCard,
  FileText,
  Gauge,
  Landmark,
  PackagePlus,
  Percent,
  Receipt,
  Search,
  Shuffle,
  ShoppingCart,
  Truck,
  UserRound,
  UsersRound,
  WalletCards
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

type Product = {
  code: string;
  name: string;
  category: string;
  unit: string;
  baseCost: number;
  iva: number;
  price: number;
};

type Supplier = {
  id: string;
  name: string;
  ruc: string;
  contact: string;
  email: string;
  phone: string;
  days: number;
};

type SupplierProduct = {
  id: string;
  supplierId: string;
  productCode: string;
  supplierSku: string;
  cost: number;
  iva: number;
};

type Warehouse = {
  id: string;
  name: string;
  location: string;
};

type StockMovement = {
  id: string;
  date: string;
  warehouseId: string;
  productCode: string;
  qty: number;
  type: "Entrada" | "Salida" | "Ajuste";
  reference: string;
};

type PurchaseItem = {
  id: string;
  productCode: string;
  productName: string;
  qty: number;
  unit: string;
  cost: number;
  iva: number;
  received: number;
};

type PurchaseOrder = {
  id: string;
  number: string;
  date: string;
  supplierId: string;
  supplierName: string;
  eta: string;
  status: "Borrador" | "Enviada" | "Recibida parcial" | "Recibida" | "Cerrada";
  items: PurchaseItem[];
  note: string;
};

type ExpenseCategory = {
  id: string;
  name: string;
};

type Expense = {
  id: string;
  date: string;
  categoryId: string;
  item: string;
  amount: number;
  note: string;
};

type ErpState = {
  products: Product[];
  suppliers: Supplier[];
  supplierProducts: SupplierProduct[];
  warehouses: Warehouse[];
  movements: StockMovement[];
  purchaseOrders: PurchaseOrder[];
  expenseCategories: ExpenseCategory[];
  expenses: Expense[];
};

type ModuleId =
  | "dashboard"
  | "sales"
  | "sales-query"
  | "purchase-orders"
  | "cxc"
  | "cxp"
  | "expenses"
  | "products"
  | "supplier-products"
  | "movements"
  | "clients"
  | "suppliers"
  | "workers"
  | "banks"
  | "cashflow"
  | "retentions"
  | "balance";

type NavItem = {
  id: ModuleId;
  label: string;
  icon: LucideIcon;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

const STORAGE_KEY = "jaeger_erp_v1";

const emptyState: ErpState = {
  products: [],
  suppliers: [],
  supplierProducts: [],
  warehouses: [{ id: "wh-main", name: "Bodega principal", location: "General" }],
  movements: [],
  purchaseOrders: [],
  expenseCategories: [],
  expenses: []
};

const navGroups: NavGroup[] = [
  {
    title: "Principal",
    items: [{ id: "dashboard", label: "Dashboard", icon: Gauge }]
  },
  {
    title: "Ventas",
    items: [
      { id: "sales", label: "Ventas sin factura", icon: Receipt },
      { id: "sales-query", label: "Consulta ventas SF", icon: Search },
      { id: "purchase-orders", label: "Ordenes de compra", icon: ShoppingCart }
    ]
  },
  {
    title: "Cartera",
    items: [
      { id: "cxc", label: "Cuentas por cobrar", icon: WalletCards },
      { id: "cxp", label: "Cuentas por pagar", icon: FileText },
      { id: "expenses", label: "Gastos del mes", icon: CreditCard }
    ]
  },
  {
    title: "Inventario",
    items: [
      { id: "products", label: "Lista de productos", icon: Archive },
      { id: "supplier-products", label: "Productos por proveedor", icon: Boxes },
      { id: "movements", label: "Movimientos de productos", icon: PackagePlus }
    ]
  },
  {
    title: "Personas",
    items: [
      { id: "clients", label: "Clientes", icon: UsersRound },
      { id: "suppliers", label: "Proveedores", icon: Truck },
      { id: "workers", label: "Trabajadores", icon: UserRound }
    ]
  },
  {
    title: "Finanzas",
    items: [
      { id: "banks", label: "Bancos", icon: Landmark },
      { id: "cashflow", label: "Flujo de caja", icon: BarChart3 },
      { id: "retentions", label: "Retenciones", icon: Activity },
      { id: "balance", label: "Balance general", icon: ClipboardList }
    ]
  }
];

const quickActions: NavItem[] = [
  { id: "cashflow", label: "Flujo", icon: BarChart3 },
  { id: "cxc", label: "CXC", icon: WalletCards },
  { id: "cxp", label: "CXP", icon: FileText },
  { id: "expenses", label: "Gastos", icon: CreditCard },
  { id: "retentions", label: "Retenciones", icon: Percent },
  { id: "balance", label: "Conciliacion", icon: Shuffle }
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function uid(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function money(value: number) {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  }).format(Number(value) || 0);
}

function numberValue(value: FormDataEntryValue | null) {
  return Number(String(value || "").replace(",", ".")) || 0;
}

function safeText(value: FormDataEntryValue | null) {
  return String(value || "").trim();
}

function readState(): ErpState {
  if (typeof window === "undefined") return emptyState;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState;
    return { ...emptyState, ...JSON.parse(raw) } as ErpState;
  } catch {
    return emptyState;
  }
}

function writeState(state: ErpState) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
}

function orderTotal(order: PurchaseOrder) {
  return order.items.reduce((sum, item) => {
    const subtotal = item.qty * item.cost;
    return sum + subtotal + subtotal * item.iva;
  }, 0);
}

export function ErpClient() {
  const [state, setState] = useState<ErpState>(emptyState);
  const [active, setActive] = useState<ModuleId>("dashboard");
  const [compact, setCompact] = useState(false);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");
  const [cart, setCart] = useState<PurchaseItem[]>([]);
  const [orderSupplier, setOrderSupplier] = useState("");
  const [receiveWarehouse, setReceiveWarehouse] = useState("wh-main");

  useEffect(() => {
    setState(readState());
  }, []);

  useEffect(() => {
    writeState(state);
  }, [state]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const activeLabel = useMemo(() => {
    return navGroups.flatMap((g) => g.items).find((item) => item.id === active)?.label || "Dashboard";
  }, [active]);

  const activeMeta = useMemo(() => {
    return navGroups.flatMap((g) => g.items).find((item) => item.id === active) || navGroups[0].items[0];
  }, [active]);

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return navGroups;
    return navGroups
      .map((group) => ({ ...group, items: group.items.filter((item) => item.label.toLowerCase().includes(q)) }))
      .filter((group) => group.items.length);
  }, [query]);

  function updateState(mutator: (draft: ErpState) => ErpState) {
    setState((current) => mutator(current));
  }

  function notify(message: string) {
    setToast(message);
  }

  function addProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const product: Product = {
      code: safeText(form.get("code")),
      name: safeText(form.get("name")),
      category: safeText(form.get("category")),
      unit: safeText(form.get("unit")) || "UND",
      baseCost: numberValue(form.get("baseCost")),
      iva: numberValue(form.get("iva")) / 100,
      price: numberValue(form.get("price"))
    };
    if (!product.code || !product.name) return notify("Codigo y producto son obligatorios.");
    updateState((draft) => ({
      ...draft,
      products: [...draft.products.filter((item) => item.code !== product.code), product].sort((a, b) => a.name.localeCompare(b.name))
    }));
    event.currentTarget.reset();
    notify("Producto guardado.");
  }

  function addSupplier(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const supplier: Supplier = {
      id: safeText(form.get("id")) || uid("prov"),
      name: safeText(form.get("name")),
      ruc: safeText(form.get("ruc")),
      contact: safeText(form.get("contact")),
      email: safeText(form.get("email")),
      phone: safeText(form.get("phone")),
      days: numberValue(form.get("days"))
    };
    if (!supplier.name) return notify("El nombre del proveedor es obligatorio.");
    updateState((draft) => ({
      ...draft,
      suppliers: [...draft.suppliers.filter((item) => item.id !== supplier.id), supplier].sort((a, b) => a.name.localeCompare(b.name))
    }));
    event.currentTarget.reset();
    notify("Proveedor guardado.");
  }

  function addSupplierProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const supplierId = safeText(form.get("supplierId"));
    const productCode = safeText(form.get("productCode"));
    if (!supplierId || !productCode) return notify("Selecciona proveedor y producto.");
    const link: SupplierProduct = {
      id: `${supplierId}-${productCode}`,
      supplierId,
      productCode,
      supplierSku: safeText(form.get("supplierSku")),
      cost: numberValue(form.get("cost")),
      iva: numberValue(form.get("iva")) / 100
    };
    updateState((draft) => ({
      ...draft,
      supplierProducts: [...draft.supplierProducts.filter((item) => item.id !== link.id), link]
    }));
    event.currentTarget.reset();
    notify("Producto asociado al proveedor.");
  }

  function addWarehouse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const warehouse: Warehouse = {
      id: uid("bod"),
      name: safeText(form.get("name")),
      location: safeText(form.get("location"))
    };
    if (!warehouse.name) return notify("El nombre de la bodega es obligatorio.");
    updateState((draft) => ({ ...draft, warehouses: [...draft.warehouses, warehouse] }));
    event.currentTarget.reset();
    notify("Bodega creada.");
  }

  function addExpenseCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const category: ExpenseCategory = { id: uid("cat"), name: safeText(form.get("name")) };
    if (!category.name) return notify("La categoria es obligatoria.");
    updateState((draft) => ({ ...draft, expenseCategories: [...draft.expenseCategories, category] }));
    event.currentTarget.reset();
    notify("Categoria creada.");
  }

  function addExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const expense: Expense = {
      id: uid("gasto"),
      date: safeText(form.get("date")) || today(),
      categoryId: safeText(form.get("categoryId")),
      item: safeText(form.get("item")),
      amount: numberValue(form.get("amount")),
      note: safeText(form.get("note"))
    };
    if (!expense.categoryId || !expense.item) return notify("Categoria e item son obligatorios.");
    updateState((draft) => ({ ...draft, expenses: [expense, ...draft.expenses] }));
    event.currentTarget.reset();
    notify("Gasto registrado.");
  }

  function addProductToCart(productCode: string) {
    if (!orderSupplier) return notify("Selecciona un proveedor primero.");
    const product = state.products.find((item) => item.code === productCode);
    const link = state.supplierProducts.find((item) => item.supplierId === orderSupplier && item.productCode === productCode);
    if (!product || !link) return notify("Producto no asociado a este proveedor.");
    setCart((current) => {
      const exists = current.find((item) => item.productCode === productCode);
      if (exists) {
        return current.map((item) => (item.productCode === productCode ? { ...item, qty: item.qty + 1 } : item));
      }
      return [
        ...current,
        {
          id: uid("oci"),
          productCode,
          productName: product.name,
          qty: 1,
          unit: product.unit,
          cost: link.cost || product.baseCost,
          iva: link.iva || product.iva,
          received: 0
        }
      ];
    });
  }

  function updateCartQty(id: string, qty: number) {
    setCart((current) => current.map((item) => (item.id === id ? { ...item, qty: Math.max(0, qty) } : item)).filter((item) => item.qty > 0));
  }

  function createPurchaseOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const supplier = state.suppliers.find((item) => item.id === orderSupplier);
    if (!supplier) return notify("Selecciona un proveedor.");
    if (!cart.length) return notify("Agrega productos a la orden.");
    const order: PurchaseOrder = {
      id: uid("oc"),
      number: `OC-${String(state.purchaseOrders.length + 1).padStart(6, "0")}`,
      date: safeText(form.get("date")) || today(),
      supplierId: supplier.id,
      supplierName: supplier.name,
      eta: safeText(form.get("eta")),
      status: "Borrador",
      items: cart,
      note: safeText(form.get("note"))
    };
    updateState((draft) => ({ ...draft, purchaseOrders: [order, ...draft.purchaseOrders] }));
    setCart([]);
    notify("Orden de compra creada.");
  }

  function receiveOrder(orderId: string) {
    const warehouse = state.warehouses.find((item) => item.id === receiveWarehouse) || state.warehouses[0];
    if (!warehouse) return notify("Crea una bodega antes de recibir inventario.");
    const order = state.purchaseOrders.find((item) => item.id === orderId);
    if (!order) return;
    const movements: StockMovement[] = order.items
      .filter((item) => item.qty - item.received > 0)
      .map((item) => ({
        id: uid("mov"),
        date: today(),
        warehouseId: warehouse.id,
        productCode: item.productCode,
        qty: item.qty - item.received,
        type: "Entrada",
        reference: order.number
      }));
    updateState((draft) => ({
      ...draft,
      movements: [...movements, ...draft.movements],
      purchaseOrders: draft.purchaseOrders.map((item) =>
        item.id === orderId
          ? {
              ...item,
              status: "Recibida",
              items: item.items.map((line) => ({ ...line, received: line.qty }))
            }
          : item
      )
    }));
    notify("Inventario recibido en " + warehouse.name + ".");
  }

  const stock = useMemo(() => {
    const map = new Map<string, number>();
    state.movements.forEach((movement) => {
      const key = `${movement.warehouseId}__${movement.productCode}`;
      const sign = movement.type === "Salida" ? -1 : 1;
      map.set(key, (map.get(key) || 0) + movement.qty * sign);
    });
    return Array.from(map.entries()).map(([key, qty]) => {
      const [warehouseId, productCode] = key.split("__");
      return {
        warehouse: state.warehouses.find((item) => item.id === warehouseId)?.name || warehouseId,
        product: state.products.find((item) => item.code === productCode)?.name || productCode,
        code: productCode,
        qty
      };
    });
  }, [state.movements, state.products, state.warehouses]);

  const supplierProductsForOrder = useMemo(() => {
    if (!orderSupplier) return [];
    return state.supplierProducts
      .filter((item) => item.supplierId === orderSupplier)
      .map((link) => ({ link, product: state.products.find((product) => product.code === link.productCode) }))
      .filter((item): item is { link: SupplierProduct; product: Product } => Boolean(item.product));
  }, [orderSupplier, state.products, state.supplierProducts]);

  const totals = useMemo(() => {
    const inventoryUnits = stock.reduce((sum, item) => sum + item.qty, 0);
    const openOrders = state.purchaseOrders.filter((item) => item.status !== "Recibida" && item.status !== "Cerrada");
    const expenses = state.expenses.reduce((sum, item) => sum + item.amount, 0);
    const purchaseTotal = state.purchaseOrders.reduce((sum, item) => sum + orderTotal(item), 0);
    return {
      products: state.products.length,
      suppliers: state.suppliers.length,
      linked: state.supplierProducts.length,
      warehouses: state.warehouses.length,
      inventoryUnits,
      openOrders: openOrders.length,
      expenses,
      purchaseTotal
    };
  }, [state.expenses, state.products.length, state.purchaseOrders, state.supplierProducts.length, state.suppliers.length, state.warehouses.length, stock]);

  const ActiveIcon = activeMeta.icon;

  return (
    <div className={`app-shell ${compact ? "compact" : ""}`}>
      <aside className="sidebar">
        <button className="collapse" onClick={() => setCompact((value) => !value)} aria-label="Contraer menu">
          <ChevronLeft size={18} />
        </button>
        <div className="brand">
          <img className="full" src="/brand/jaeger-logo-horizontal.png" alt="Jaeger Enterprise Group" />
          <img className="iso" src="/brand/jaeger-isotype.png" alt="Jaeger" />
        </div>
        <div className="nav-search">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar modulo..." />
        </div>
        <nav className="nav">
          {filteredGroups.map((group) => (
            <div className="nav-group" key={group.title}>
              <div className="nav-title">{group.title}</div>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button className={active === item.id ? "active" : ""} key={item.id} onClick={() => setActive(item.id)}>
                    <Icon />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="page-heading">
            <span className="module-title-icon">
              <ActiveIcon size={18} />
            </span>
            <h1>{activeLabel}</h1>
          </div>
          <div className="topbar-actions">
            {quickActions.map((item) => {
              const Icon = item.icon;
              return (
                <button className={active === item.id ? "top-action active" : "top-action"} key={item.id} onClick={() => setActive(item.id)}>
                  <Icon size={15} />
                  {item.label}
                </button>
              );
            })}
            <span className="period-pill">
              <b>Periodo</b>
              Actual
            </span>
            <div className="user-pill" title="Administrador">
              <UserRound size={17} />
            </div>
          </div>
        </header>
        <div className="content">{renderActive()}</div>
      </main>
      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  );

  function renderActive() {
    if (active === "dashboard") return <Dashboard />;
    if (active === "products") return <Products />;
    if (active === "suppliers") return <Suppliers />;
    if (active === "supplier-products") return <SupplierProducts />;
    if (active === "purchase-orders") return <PurchaseOrders />;
    if (active === "movements") return <Inventory />;
    if (active === "expenses") return <Expenses />;
    return <Placeholder title={activeLabel} />;
  }

  function Dashboard() {
    const recentOrders = state.purchaseOrders.slice(0, 5);
    const stockCoverage = totals.products ? Math.min(100, Math.round((totals.linked / Math.max(1, totals.products)) * 100)) : 0;
    return (
      <>
        <SectionHead title="Resumen empresarial" subtitle="Carga inicial limpia para Jaeger Enterprise Group." />
        <div className="dashboard-grid">
          <div className="dashboard-stack">
            <div className="grid kpi-grid">
              <Metric label="Productos" value={String(totals.products)} />
              <Metric label="Proveedores" value={String(totals.suppliers)} />
              <Metric label="Productos vinculados" value={String(totals.linked)} />
              <Metric label="Bodegas" value={String(totals.warehouses)} />
              <Metric label="Unidades en stock" value={String(totals.inventoryUnits)} />
              <Metric label="Ordenes abiertas" value={String(totals.openOrders)} />
              <Metric label="Compras registradas" value={money(totals.purchaseTotal)} />
              <Metric label="Gastos del mes" value={money(totals.expenses)} />
            </div>
            <div className="card">
              <div className="card-body">
                <h3 className="panel-title">Flujo de trabajo resumido</h3>
                <div className="flow-strip">
                  <FlowRow label="Base" value={`${totals.products} productos`} pct={totals.products ? 100 : 0} />
                  <FlowRow label="Vinculos" value={`${totals.linked} asociados`} pct={stockCoverage} />
                  <FlowRow label="Compras" value={`${totals.openOrders} abiertas`} pct={totals.openOrders ? 70 : 12} />
                  <FlowRow label="Stock" value={`${totals.inventoryUnits} unidades`} pct={totals.inventoryUnits ? 86 : 8} />
                </div>
              </div>
            </div>
          </div>
          <div className="dashboard-stack">
            <div className="card suggestion-card">
              <div className="card-body">
                <h3 className="panel-title">Pago recomendado esta semana</h3>
                <strong style={{ display: "block", fontSize: 46, letterSpacing: "-0.06em", marginTop: 22 }}>{money(0)}</strong>
                <p style={{ color: "var(--muted)", fontWeight: 700 }}>Sin CXP pendiente registrada en esta version.</p>
                <button className="btn" onClick={() => setActive("cxp")}>
                  Ver detalle
                </button>
              </div>
            </div>
            <div className="card">
              <div className="card-body">
                <h3 className="panel-title">Inventario - cobertura inicial</h3>
                <p style={{ color: "var(--muted)", fontWeight: 700 }}>
                  {totals.linked
                    ? `${totals.linked} productos ya tienen proveedor asignado.`
                    : "Asocia productos con proveedores para que aparezcan en las ordenes de compra."}
                </p>
                <button className="btn primary" onClick={() => setActive("supplier-products")}>
                  Asociar productos
                </button>
              </div>
            </div>
            <div className="card">
              <div className="card-body">
                <h3 className="panel-title">Ultimas ordenes de compra</h3>
                <Table
                  empty="No hay ordenes todavia."
                  headers={["Numero", "Proveedor", "Estado", "Total"]}
                  rows={recentOrders.map((order) => [order.number, order.supplierName, <StatusBadge key={order.id} status={order.status} />, money(orderTotal(order))])}
                />
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  function Products() {
    return (
      <>
        <SectionHead title="Lista de productos" subtitle="Tus codigos los defines manualmente." />
        <div className="card">
          <div className="card-body">
            <form className="form-grid" onSubmit={addProduct}>
              <label>
                Codigo
                <input name="code" placeholder="JEG-001" />
              </label>
              <label>
                Producto
                <input name="name" placeholder="Nombre del producto" />
              </label>
              <label>
                Categoria
                <input name="category" placeholder="Categoria" />
              </label>
              <label>
                Unidad
                <input name="unit" placeholder="UND, KG, CJ" />
              </label>
              <label>
                Costo base
                <input name="baseCost" type="number" step="0.0001" />
              </label>
              <label>
                IVA %
                <input name="iva" type="number" step="0.01" defaultValue="15" />
              </label>
              <label>
                Precio final
                <input name="price" type="number" step="0.01" />
              </label>
              <label>
                Guardar
                <button className="btn primary" type="submit">
                  Guardar producto
                </button>
              </label>
            </form>
          </div>
        </div>
        <DataCard title="Productos registrados">
          <Table
            empty="Aun no hay productos."
            headers={["Codigo", "Producto", "Categoria", "Unidad", "Costo", "IVA", "Precio"]}
            rows={state.products.map((item) => [item.code, item.name, item.category, item.unit, money(item.baseCost), `${item.iva * 100}%`, money(item.price)])}
          />
        </DataCard>
      </>
    );
  }

  function Suppliers() {
    return (
      <>
        <SectionHead title="Proveedores" subtitle="Base limpia de proveedores Jaeger." />
        <div className="card">
          <div className="card-body">
            <form className="form-grid" onSubmit={addSupplier}>
              <label>
                Nombre
                <input name="name" placeholder="Proveedor" />
              </label>
              <label>
                RUC
                <input name="ruc" placeholder="Identificacion" />
              </label>
              <label>
                Contacto
                <input name="contact" placeholder="Contacto comercial" />
              </label>
              <label>
                Correo
                <input name="email" type="email" placeholder="correo@proveedor.com" />
              </label>
              <label>
                WhatsApp
                <input name="phone" placeholder="593..." />
              </label>
              <label>
                Dias credito
                <input name="days" type="number" defaultValue="0" />
              </label>
              <label>
                Guardar
                <button className="btn primary" type="submit">
                  Guardar proveedor
                </button>
              </label>
            </form>
          </div>
        </div>
        <DataCard title="Proveedores registrados">
          <Table
            empty="Aun no hay proveedores."
            headers={["Proveedor", "RUC", "Contacto", "Correo", "WhatsApp", "Credito"]}
            rows={state.suppliers.map((item) => [item.name, item.ruc, item.contact, item.email, item.phone, `${item.days} dias`])}
          />
        </DataCard>
      </>
    );
  }

  function SupplierProducts() {
    return (
      <>
        <SectionHead title="Productos por proveedor" subtitle="Aqui decides que productos pertenecen a cada proveedor." />
        <div className="card">
          <div className="card-body">
            <form className="form-grid" onSubmit={addSupplierProduct}>
              <label>
                Proveedor
                <select name="supplierId" defaultValue="">
                  <option value="" disabled>
                    Seleccionar
                  </option>
                  {state.suppliers.map((item) => (
                    <option value={item.id} key={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Producto
                <select name="productCode" defaultValue="">
                  <option value="" disabled>
                    Seleccionar
                  </option>
                  {state.products.map((item) => (
                    <option value={item.code} key={item.code}>
                      {item.code} - {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Codigo proveedor
                <input name="supplierSku" placeholder="Opcional" />
              </label>
              <label>
                Costo proveedor
                <input name="cost" type="number" step="0.0001" />
              </label>
              <label>
                IVA %
                <input name="iva" type="number" step="0.01" defaultValue="15" />
              </label>
              <label>
                Guardar
                <button className="btn primary" type="submit">
                  Asociar producto
                </button>
              </label>
            </form>
          </div>
        </div>
        <DataCard title="Asociaciones activas">
          <Table
            empty="Aun no hay productos asociados a proveedores."
            headers={["Proveedor", "Codigo", "Producto", "Codigo prov.", "Costo", "IVA"]}
            rows={state.supplierProducts.map((link) => {
              const supplier = state.suppliers.find((item) => item.id === link.supplierId);
              const product = state.products.find((item) => item.code === link.productCode);
              return [supplier?.name || "-", link.productCode, product?.name || "-", link.supplierSku || "-", money(link.cost), `${link.iva * 100}%`];
            })}
          />
        </DataCard>
      </>
    );
  }

  function PurchaseOrders() {
    return (
      <>
        <SectionHead title="Ordenes de compra" subtitle="Los productos aparecen segun el proveedor seleccionado." />
        <div className="grid two-grid">
          <div className="card">
            <div className="card-body">
              <form onSubmit={createPurchaseOrder}>
                <div className="form-grid">
                  <label>
                    Proveedor
                    <select value={orderSupplier} onChange={(event) => setOrderSupplier(event.target.value)}>
                      <option value="">Seleccionar</option>
                      {state.suppliers.map((item) => (
                        <option value={item.id} key={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Fecha
                    <input name="date" type="date" defaultValue={today()} />
                  </label>
                  <label>
                    Entrega esperada
                    <input name="eta" type="date" />
                  </label>
                  <label>
                    Bodega recepcion
                    <select value={receiveWarehouse} onChange={(event) => setReceiveWarehouse(event.target.value)}>
                      {state.warehouses.map((item) => (
                        <option value={item.id} key={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div style={{ marginTop: 14 }}>
                  <label>
                    Observacion
                    <textarea name="note" placeholder="Notas de compra" />
                  </label>
                </div>
                <div style={{ marginTop: 14 }}>
                  <h3 className="panel-title">Productos disponibles del proveedor</h3>
                  <div className="grid">
                    {supplierProductsForOrder.length ? (
                      supplierProductsForOrder.map(({ link, product }) => (
                        <button className="btn" type="button" key={link.id} onClick={() => addProductToCart(product.code)}>
                          <PackagePlus size={17} />
                          {product.code} - {product.name} - {money(link.cost)}
                        </button>
                      ))
                    ) : (
                      <div className="empty">Selecciona un proveedor con productos asociados.</div>
                    )}
                  </div>
                </div>
                <div style={{ marginTop: 14 }}>
                  <h3 className="panel-title">Carrito de compra</h3>
                  <Table
                    empty="Agrega productos para crear la orden."
                    headers={["Producto", "Cantidad", "Costo", "IVA", "Total"]}
                    rows={cart.map((item) => [
                      item.productName,
                      <input key={item.id} type="number" min="0" step="0.01" value={item.qty} onChange={(event) => updateCartQty(item.id, Number(event.target.value))} />,
                      money(item.cost),
                      `${item.iva * 100}%`,
                      money(item.qty * item.cost * (1 + item.iva))
                    ])}
                  />
                </div>
                <div className="toolbar" style={{ marginTop: 14 }}>
                  <button className="btn primary" type="submit">
                    Crear orden
                  </button>
                  <button className="btn" type="button" onClick={() => setCart([])}>
                    Limpiar carrito
                  </button>
                </div>
              </form>
            </div>
          </div>
          <div className="card">
            <div className="card-body">
              <h3 className="panel-title">Ordenes registradas</h3>
              <div className="grid">
                {state.purchaseOrders.length ? (
                  state.purchaseOrders.map((order) => (
                    <div className="card" key={order.id}>
                      <div className="card-body">
                        <div className="toolbar" style={{ justifyContent: "space-between" }}>
                          <strong>{order.number}</strong>
                          <StatusBadge status={order.status} />
                        </div>
                        <p style={{ color: "var(--muted)", fontWeight: 700 }}>{order.supplierName}</p>
                        <p>
                          {order.items.length} productos - <strong>{money(orderTotal(order))}</strong>
                        </p>
                        <div className="split-actions">
                          <button className="btn" onClick={() => receiveOrder(order.id)} disabled={order.status === "Recibida"}>
                            Recibir inventario
                          </button>
                          <button
                            className="btn"
                            onClick={() =>
                              updateState((draft) => ({
                                ...draft,
                                purchaseOrders: draft.purchaseOrders.map((item) => (item.id === order.id ? { ...item, status: "Enviada" } : item))
                              }))
                            }
                          >
                            Marcar enviada
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty">Aun no hay ordenes.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  function Inventory() {
    return (
      <>
        <SectionHead title="Movimientos de productos" subtitle="Inventario general con opcion de registrar nuevas bodegas." />
        <div className="card">
          <div className="card-body">
            <form className="form-grid" onSubmit={addWarehouse}>
              <label>
                Nueva bodega
                <input name="name" placeholder="Bodega norte" />
              </label>
              <label>
                Ubicacion
                <input name="location" placeholder="Ciudad / referencia" />
              </label>
              <label>
                Crear
                <button className="btn primary" type="submit">
                  Crear bodega
                </button>
              </label>
            </form>
          </div>
        </div>
        <DataCard title="Inventario por bodega">
          <Table empty="Aun no hay stock recibido." headers={["Bodega", "Codigo", "Producto", "Stock"]} rows={stock.map((item) => [item.warehouse, item.code, item.product, item.qty])} />
        </DataCard>
        <DataCard title="Movimientos recientes">
          <Table
            empty="Aun no hay movimientos."
            headers={["Fecha", "Tipo", "Bodega", "Producto", "Cantidad", "Referencia"]}
            rows={state.movements.map((item) => [
              item.date,
              item.type,
              state.warehouses.find((warehouse) => warehouse.id === item.warehouseId)?.name || "-",
              state.products.find((product) => product.code === item.productCode)?.name || item.productCode,
              item.qty,
              item.reference
            ])}
          />
        </DataCard>
      </>
    );
  }

  function Expenses() {
    return (
      <>
        <SectionHead title="Gastos del mes" subtitle="Categorias propias de Jaeger, sin listas heredadas de CSB." />
        <div className="grid two-grid">
          <div className="card">
            <div className="card-body">
              <h3 className="panel-title">Registrar gasto</h3>
              <form className="form-grid" onSubmit={addExpense}>
                <label>
                  Fecha
                  <input name="date" type="date" defaultValue={today()} />
                </label>
                <label>
                  Categoria
                  <select name="categoryId" defaultValue="">
                    <option value="" disabled>
                      Seleccionar
                    </option>
                    {state.expenseCategories.map((item) => (
                      <option value={item.id} key={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Item
                  <input name="item" placeholder="Descripcion" />
                </label>
                <label>
                  Valor
                  <input name="amount" type="number" step="0.01" />
                </label>
                <label>
                  Nota
                  <input name="note" />
                </label>
                <label>
                  Guardar
                  <button className="btn primary" type="submit">
                    Registrar gasto
                  </button>
                </label>
              </form>
            </div>
          </div>
          <div className="card">
            <div className="card-body">
              <h3 className="panel-title">Crear categoria</h3>
              <form className="toolbar" onSubmit={addExpenseCategory}>
                <input name="name" placeholder="Ej. Marketing, Logistica, Oficina" />
                <button className="btn primary" type="submit">
                  Crear
                </button>
              </form>
            </div>
          </div>
        </div>
        <DataCard title="Gastos registrados">
          <Table
            empty="Aun no hay gastos."
            headers={["Fecha", "Categoria", "Item", "Valor", "Nota"]}
            rows={state.expenses.map((item) => [
              item.date,
              state.expenseCategories.find((category) => category.id === item.categoryId)?.name || "-",
              item.item,
              money(item.amount),
              item.note
            ])}
          />
        </DataCard>
      </>
    );
  }
}

function SectionHead({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="section-head">
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="card metric">
      <div className="card-body">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function FlowRow({ label, value, pct }: { label: string; value: string; pct: number }) {
  return (
    <div className="flow-row">
      <strong>{label}</strong>
      <div className="flow-bar">
        <span style={{ width: `${Math.max(4, Math.min(100, pct))}%` }} />
      </div>
      <span>{value}</span>
    </div>
  );
}

function DataCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ marginTop: 14 }}>
      <div className="card-body">
        <h3 className="panel-title">{title}</h3>
        {children}
      </div>
    </div>
  );
}

function Table({ headers, rows, empty }: { headers: string[]; rows: React.ReactNode[][]; empty: string }) {
  if (!rows.length) return <div className="empty">{empty}</div>;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }: { status: PurchaseOrder["status"] }) {
  const cls = status === "Recibida" || status === "Cerrada" ? "ok" : status === "Borrador" ? "warn" : "";
  return <span className={`badge ${cls}`}>{status}</span>;
}

function Placeholder({ title }: { title: string }) {
  const spec = moduleSpec(title);
  return (
    <>
      <SectionHead title={title} subtitle={spec.subtitle} />
      <div className="module-workspace">
        <div className="module-toolbar card">
          <div className="toolbar">
            {spec.actions.map((action) => (
              <button className={action.primary ? "btn primary" : "btn"} key={action.label}>
                {action.label}
              </button>
            ))}
          </div>
          <div className="toolbar">
            <input placeholder="Buscar..." />
            <select defaultValue="actual">
              <option value="actual">Periodo actual</option>
              <option value="mes">Este mes</option>
              <option value="anio">Este anio</option>
            </select>
          </div>
        </div>

        <div className="grid kpi-grid compact-kpis">
          {spec.metrics.map((metric) => (
            <Metric key={metric.label} label={metric.label} value={metric.value} />
          ))}
        </div>

        <div className="grid two-grid">
          <div className="card">
            <div className="card-body">
              <h3 className="panel-title">{spec.tableTitle}</h3>
              <Table empty={spec.empty} headers={spec.headers} rows={[]} />
            </div>
          </div>
          <div className="card">
            <div className="card-body">
              <h3 className="panel-title">{spec.formTitle}</h3>
              <div className="module-form">
                {spec.fields.map((field) => (
                  <label key={field}>
                    {field}
                    <input placeholder={field} />
                  </label>
                ))}
                <button className="btn primary">Guardar</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function moduleSpec(title: string) {
  const base = {
    subtitle: "Modulo operativo con estructura Jaeger basada en el flujo del ERP CSB.",
    actions: [
      { label: "Nuevo", primary: true },
      { label: "Importar" },
      { label: "Exportar" }
    ],
    metrics: [
      { label: "Total registros", value: "0" },
      { label: "Pendientes", value: "0" },
      { label: "Total mes", value: money(0) },
      { label: "Estado", value: "Activo" }
    ],
    tableTitle: "Registros",
    formTitle: "Registro rapido",
    headers: ["Fecha", "Documento", "Contraparte", "Valor", "Estado"],
    fields: ["Fecha", "Documento", "Contraparte", "Valor"],
    empty: "Sin registros todavia."
  };

  const byTitle: Record<string, Partial<typeof base>> = {
    "Ventas sin factura": {
      subtitle: "Registro de ventas sin factura con sucursal, cliente, forma de pago y estado.",
      tableTitle: "Ventas sin factura registradas",
      formTitle: "Nueva venta sin factura",
      headers: ["Fecha", "Sucursal", "Cliente", "Total", "Estado"],
      fields: ["Fecha", "Sucursal", "Cliente", "Total"]
    },
    "Consulta ventas SF": {
      subtitle: "Consulta y control de ventas sin factura.",
      actions: [{ label: "Actualizar", primary: true }, { label: "Filtrar" }, { label: "Exportar" }],
      tableTitle: "Consulta de ventas",
      formTitle: "Filtros",
      fields: ["Desde", "Hasta", "Cliente", "Sucursal"]
    },
    "Cuentas por cobrar": {
      subtitle: "Cartera de clientes, abonos, saldos y vencimientos.",
      tableTitle: "Facturas por cobrar",
      formTitle: "Registrar CXC",
      headers: ["Fecha", "Factura", "Cliente", "Saldo", "Estado"],
      fields: ["Fecha", "Factura", "Cliente", "Total"]
    },
    "Cuentas por pagar": {
      subtitle: "Cartera de proveedores vinculada a compras y facturas.",
      tableTitle: "Facturas por pagar",
      formTitle: "Registrar CXP",
      headers: ["Fecha", "Factura", "Proveedor", "Saldo", "Estado"],
      fields: ["Fecha", "Factura", "Proveedor", "Total"]
    },
    "Clientes": {
      subtitle: "Base de clientes para ventas y cartera.",
      tableTitle: "Clientes registrados",
      formTitle: "Nuevo cliente",
      headers: ["RUC", "Cliente", "Telefono", "Correo", "Estado"],
      fields: ["RUC", "Nombre", "Telefono", "Correo"]
    },
    "Trabajadores": {
      subtitle: "Base interna de trabajadores y responsables.",
      tableTitle: "Trabajadores registrados",
      formTitle: "Nuevo trabajador",
      headers: ["Cedula", "Nombre", "Cargo", "Telefono", "Estado"],
      fields: ["Cedula", "Nombre", "Cargo", "Telefono"]
    },
    "Bancos": {
      subtitle: "Bancos, saldos, movimientos y obligaciones.",
      tableTitle: "Cuentas bancarias",
      formTitle: "Nueva cuenta o deuda",
      headers: ["Banco", "Cuenta", "Saldo", "Tipo", "Estado"],
      fields: ["Banco", "Cuenta", "Saldo", "Tipo"]
    },
    "Flujo de caja": {
      subtitle: "Ingresos, egresos, saldos y proyeccion de caja.",
      actions: [{ label: "Actualizar flujo", primary: true }, { label: "Nuevo ajuste" }, { label: "Exportar" }],
      tableTitle: "Flujo mensual",
      formTitle: "Ajuste de flujo",
      headers: ["Mes", "Ingresos", "Egresos", "Neto", "Acumulado"],
      fields: ["Fecha", "Concepto", "Ingreso", "Egreso"]
    },
    "Retenciones": {
      subtitle: "Retenciones recibidas y asociacion contra CXC.",
      tableTitle: "Retenciones registradas",
      formTitle: "Nueva retencion",
      headers: ["Fecha", "Cliente", "Factura", "IVA", "Renta"],
      fields: ["Fecha", "Cliente", "Factura", "Valor"]
    },
    "Balance general": {
      subtitle: "Activos, pasivos, patrimonio y variables de control.",
      tableTitle: "Variables del balance",
      formTitle: "Nueva variable",
      headers: ["Tipo", "Variable", "Subitem", "Valor", "Estado"],
      fields: ["Tipo", "Variable", "Subitem", "Valor"]
    }
  };

  return { ...base, ...(byTitle[title] || {}) };
}
