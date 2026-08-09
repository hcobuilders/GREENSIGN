import { useEffect, useMemo, useState } from "react";
import { Link, useFetcher, useLocation, useNavigate } from "react-router";
import {
  AddressField,
  formatAddress,
  type StructuredAddress,
} from "./address-field";
import type { PartnerRow } from "./projects-page";

export function NetworkWorkspace({ partners }: { partners: PartnerRow[] }) {
  const fetcher = useFetcher<{ createdId?: string }>(),
    location = useLocation(),
    navigate = useNavigate(),
    [query, setQuery] = useState(""),
    [creating, setCreating] = useState(
      new URLSearchParams(location.search).get("create") === "1",
    ),
    filtered = useMemo(
      () =>
        partners.filter((item) =>
          `${item.name} ${item.primaryTrade} ${item.email}`
            .toLowerCase()
            .includes(query.toLowerCase()),
        ),
      [partners, query],
    ),
    active = partners.find(
      (partner) => partner.id === location.pathname.split("/")[3],
    );
  useEffect(() => {
    if (fetcher.data?.createdId)
      navigate(`/app/network/${fetcher.data.createdId}`);
  }, [fetcher.data?.createdId, navigate]);
  if (active) return <PartnerProfile partner={active} />;
  return (
    <div>
      <div className="filter-bar">
        <input
          className="search-input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search companies, trades, contacts, or qualifications…"
        />
        <span className="result-count">{filtered.length} PARTNERS</span>
        <button className="primary" onClick={() => setCreating(true)}>
          + ADD PARTNER
        </button>
      </div>
      <div className="network-grid">
        {filtered.map((item) => (
          <article className="partner-card" key={item.id}>
            <span
              className={`tag partner-status ${item.status.toLowerCase().includes("qualified") ? "qualified" : "review-due"}`}
            >
              {item.status.toUpperCase()}
            </span>
            <h3>{item.name}</h3>
            <p>{item.primaryTrade}</p>
            <div>
              <small>PRIMARY CONTACT</small>
              <b>{item.email || "Contact not set"}</b>
              <span>{formatAddress(item.address)}</span>
            </div>
            <Link className="outline-action" to={`/app/network/${item.id}`}>
              VIEW PROFILE
            </Link>
          </article>
        ))}
      </div>
      {creating && (
        <PartnerDrawer
          close={() => setCreating(false)}
          submit={(form) => {
            fetcher.submit(form, { method: "post" });
            setCreating(false);
          }}
        />
      )}
    </div>
  );
}

function PartnerDrawer({
  close,
  submit,
}: {
  close: () => void;
  submit: (form: FormData) => void;
}) {
  const [address, setAddress] = useState<StructuredAddress>({
    formatted: "",
    street: "",
    city: "",
    state: "",
    zip: "",
  });
  return (
    <div className="drawer-backdrop" onMouseDown={close}>
      <form
        className="metric-drawer partner-drawer"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          form.set("intent", "partner-create");
          form.set("address", JSON.stringify(address));
          form.set(
            "prequalification",
            JSON.stringify({
              bondingCapacity: Number(form.get("bondingCapacity") || 0),
              approvedLimit: Number(form.get("approvedLimit") || 0),
              safetyRating: String(form.get("safetyRating") || "Pending"),
              insuranceStatus: String(
                form.get("insuranceStatus") || "review due",
              ),
            }),
          );
          form.set("pastProjects", JSON.stringify([]));
          submit(form);
        }}
      >
        <div className="drawer-head">
          <div>
            <span className="eyebrow">TRADE PARTNER</span>
            <h2>ADD CONTRACTOR</h2>
          </div>
          <button type="button" className="secondary" onClick={close}>
            CLOSE
          </button>
        </div>
        <div className="drawer-grid">
          <label>
            COMPANY NAME
            <input name="name" required />
          </label>
          <label>
            PRIMARY TRADE
            <input name="primaryTrade" required />
          </label>
          <label>
            STATUS
            <select name="status">
              <option value="review due">REVIEW DUE</option>
              <option value="qualified">QUALIFIED</option>
              <option value="suspended">SUSPENDED</option>
            </select>
          </label>
          <label>
            EMAIL
            <input name="email" type="email" />
          </label>
          <label>
            PHONE
            <input name="phone" type="tel" />
          </label>
          <label>
            LICENSE NUMBER
            <input name="licenseNumber" />
          </label>
          <label>
            LICENSE STATE
            <input name="licenseState" maxLength={2} />
          </label>
          <label>
            LICENSE EXPIRATION
            <input name="licenseExpires" type="date" />
          </label>
          <AddressField value={address} onChange={setAddress} />
          <label>
            BONDING CAPACITY
            <input name="bondingCapacity" type="number" />
          </label>
          <label>
            APPROVED LIMIT
            <input name="approvedLimit" type="number" />
          </label>
          <label>
            SAFETY RATING
            <input name="safetyRating" />
          </label>
          <label>
            INSURANCE STATUS
            <input name="insuranceStatus" />
          </label>
          <label className="wide">
            NOTES
            <textarea name="notes" />
          </label>
        </div>
        <div className="drawer-actions">
          <button type="button" className="secondary" onClick={close}>
            CANCEL
          </button>
          <button className="primary">ADD PARTNER</button>
        </div>
      </form>
    </div>
  );
}

function PartnerProfile({ partner }: { partner: PartnerRow }) {
  const fetcher = useFetcher(),
    [editing, setEditing] = useState(false),
    prequal = (partner.prequalification ?? {}) as Record<string, unknown>,
    [address, setAddress] = useState<StructuredAddress>(
      partner.address as StructuredAddress,
    ),
    [pastProjects, setPastProjects] = useState<string[]>(
      Array.isArray(partner.pastProjects)
        ? partner.pastProjects.map(String)
        : [],
    );
  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget),
      patch = {
        name: String(form.get("name")),
        status: String(form.get("status")),
        primaryTrade: String(form.get("primaryTrade")),
        email: String(form.get("email")),
        phone: String(form.get("phone")),
        licenseNumber: String(form.get("licenseNumber")),
        licenseState: String(form.get("licenseState")),
        licenseExpires: String(form.get("licenseExpires")) || null,
        address,
        prequalification: {
          bondingCapacity: Number(form.get("bondingCapacity") || 0),
          approvedLimit: Number(form.get("approvedLimit") || 0),
          safetyRating: String(form.get("safetyRating")),
          insuranceStatus: String(form.get("insuranceStatus")),
        },
        pastProjects,
        notes: String(form.get("notes")),
      };
    fetcher.submit(
      {
        intent: "partner-update",
        id: partner.id,
        patch: JSON.stringify(patch),
      },
      { method: "post" },
    );
    setEditing(false);
  }
  return (
    <div className="partner-profile">
      <div className="project-overview-toolbar">
        <Link to="/app/network">← TRADE PARTNER DIRECTORY</Link>
        <button className="primary" onClick={() => setEditing(true)}>
          EDIT PROFILE
        </button>
      </div>
      <div className="partner-profile-hero">
        <span
          className={`tag partner-status ${partner.status === "qualified" ? "qualified" : "review-due"}`}
        >
          {partner.status.toUpperCase()}
        </span>
        <h2>{partner.name}</h2>
        <p>
          {partner.primaryTrade} · {partner.email}
        </p>
      </div>
      <form onSubmit={save}>
        <fieldset disabled={!editing || fetcher.state !== "idle"}>
          <section className="partner-profile-grid">
            <div className="panel">
              <div className="panel-head">
                <h2>COMPANY INFORMATION</h2>
              </div>
              <div className="drawer-grid">
                <label>
                  COMPANY NAME
                  <input name="name" defaultValue={partner.name} />
                </label>
                <label>
                  PRIMARY TRADE
                  <input
                    name="primaryTrade"
                    defaultValue={partner.primaryTrade}
                  />
                </label>
                <label>
                  STATUS
                  <select name="status" defaultValue={partner.status}>
                    <option value="review due">REVIEW DUE</option>
                    <option value="qualified">QUALIFIED</option>
                    <option value="suspended">SUSPENDED</option>
                  </select>
                </label>
                <label>
                  EMAIL
                  <input
                    name="email"
                    type="email"
                    defaultValue={partner.email}
                  />
                </label>
                <label>
                  PHONE
                  <input name="phone" defaultValue={partner.phone} />
                </label>
                <AddressField value={address} onChange={setAddress} />
              </div>
            </div>
            <div className="panel">
              <div className="panel-head">
                <h2>LICENSE + PREQUALIFICATION</h2>
              </div>
              <div className="drawer-grid">
                <label>
                  LICENSE NUMBER
                  <input
                    name="licenseNumber"
                    defaultValue={partner.licenseNumber}
                  />
                </label>
                <label>
                  LICENSE STATE
                  <input
                    name="licenseState"
                    defaultValue={partner.licenseState}
                  />
                </label>
                <label>
                  LICENSE EXPIRATION
                  <input
                    name="licenseExpires"
                    type="date"
                    defaultValue={partner.licenseExpires ?? ""}
                  />
                </label>
                <label>
                  BONDING CAPACITY
                  <input
                    name="bondingCapacity"
                    type="number"
                    defaultValue={Number(prequal.bondingCapacity ?? 0)}
                  />
                </label>
                <label>
                  APPROVED LIMIT
                  <input
                    name="approvedLimit"
                    type="number"
                    defaultValue={Number(prequal.approvedLimit ?? 0)}
                  />
                </label>
                <label>
                  SAFETY RATING
                  <input
                    name="safetyRating"
                    defaultValue={String(prequal.safetyRating ?? "")}
                  />
                </label>
                <label>
                  INSURANCE STATUS
                  <input
                    name="insuranceStatus"
                    defaultValue={String(prequal.insuranceStatus ?? "")}
                  />
                </label>
              </div>
            </div>
          </section>
          <section className="panel partner-history">
            <div className="panel-head">
              <div>
                <h2>PAST PROJECT INFORMATION</h2>
                <span className="panel-caption">One project per line.</span>
              </div>
              <button
                type="button"
                className="secondary"
                onClick={() => setPastProjects((current) => [...current, ""])}
              >
                + ADD PROJECT
              </button>
            </div>
            {pastProjects.map((project, index) => (
              <div className="history-row" key={index}>
                <input
                  value={project}
                  onChange={(event) =>
                    setPastProjects((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? event.target.value : item,
                      ),
                    )
                  }
                />
                <button
                  type="button"
                  className="danger-button"
                  onClick={() =>
                    setPastProjects((current) =>
                      current.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                >
                  REMOVE
                </button>
              </div>
            ))}
            <label>
              INTERNAL NOTES
              <textarea name="notes" defaultValue={partner.notes} />
            </label>
          </section>
        </fieldset>
        {editing && (
          <div className="approval-actions">
            <button
              type="button"
              className="secondary"
              onClick={() => setEditing(false)}
            >
              CANCEL
            </button>
            <button className="primary">SAVE TRADE PARTNER</button>
          </div>
        )}
      </form>
    </div>
  );
}
