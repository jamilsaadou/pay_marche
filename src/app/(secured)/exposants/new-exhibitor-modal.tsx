"use client";

import { useRef } from "react";
import { FaPlusCircle, FaTimes } from "react-icons/fa";

type NewExhibitorModalProps = {
  action: (formData: FormData) => Promise<void>;
};

export function NewExhibitorModal({ action }: NewExhibitorModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  function openModal() {
    dialogRef.current?.showModal();
  }

  function closeModal() {
    dialogRef.current?.close();
  }

  return (
    <>
      <button type="button" className="btn btn-primary inline-flex items-center gap-2" onClick={openModal}>
        <FaPlusCircle />
        Nouvel exposant
      </button>

      <dialog ref={dialogRef} className="modal-shell">
        <article className="modal-panel glass-card p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Nouvel exposant</h2>
              <p className="mt-1 text-sm text-zinc-600">Saisir les informations minimales puis valider.</p>
            </div>
            <button type="button" className="btn btn-secondary inline-flex items-center gap-2 px-3" onClick={closeModal}>
              <FaTimes />
            </button>
          </div>

          <form action={action} className="mt-4 space-y-3" onSubmit={closeModal}>
            <div>
              <label className="mb-1 block text-sm font-medium">Numero de reference</label>
              <input name="referenceNumber" className="field" required placeholder="EXP-2026-001" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Nom complet</label>
              <input name="fullName" className="field" required placeholder="Amina Issa" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Montant attendu</label>
              <input name="expectedAmount" type="number" min="0" step="0.01" className="field" required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Telephone</label>
              <input name="phone" className="field" placeholder="+227 ..." />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Entreprise</label>
              <input name="companyName" className="field" placeholder="Nom de la structure" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn btn-secondary" onClick={closeModal}>
                Annuler
              </button>
              <button className="btn btn-primary" type="submit">
                Creer l&apos;exposant
              </button>
            </div>
          </form>
        </article>
      </dialog>
    </>
  );
}
