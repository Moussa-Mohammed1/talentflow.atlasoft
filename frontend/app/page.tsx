"use client";

import axios from "axios";
import { FormEvent, useId, useState } from "react";
import api from "@/lib/axios";
const UPLOAD_ENDPOINT = "http://127.0.0.1:8000/api/resumes/analyze";
const UPLOAD_PATH = "resumes/identity";

type ResultState = {
  status: number;
  ok: boolean;
  body: string;
};

function formatResponseBody(rawBody: unknown) {
  if (typeof rawBody === "string") {
    try {
      return JSON.stringify(JSON.parse(rawBody), null, 2);
    } catch {
      return rawBody;
    }
  }

  try {
    return JSON.stringify(rawBody, null, 2);
  } catch {
    return String(rawBody);
  }
}

export default function Home() {
  const inputId = useId();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<ResultState | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedFile) {
      setError("Please select a CV file before submitting.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await api.post(UPLOAD_PATH, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setResult({
        status: response.status,
        ok: response.status >= 200 && response.status < 300,
        body: formatResponseBody(response.data),
      });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        setResult({
          status: error.response.status,
          ok: false,
          body: formatResponseBody(error.response.data),
        });
      } else {
        setError("Unable to reach the upload endpoint.");
        setResult(null);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.18),_transparent_32%),linear-gradient(180deg,#fff7ed_0%,#fff_45%,#f8fafc_100%)] text-slate-900">
      <main className="mx-auto flex min-h-full w-full max-w-5xl items-center px-4 py-10 sm:px-6 lg:px-8">
        <section className="grid w-full gap-8 rounded-[2rem] border border-white/60 bg-white/85 p-6 shadow-[0_30px_80px_-32px_rgba(15,23,42,0.35)] backdrop-blur md:grid-cols-[1.05fr_0.95fr] md:p-8 lg:p-10">
          <div className="flex flex-col justify-between gap-8 rounded-[1.5rem] bg-slate-950 p-8 text-white shadow-inner shadow-black/20">
            <div className="space-y-5">
              <span className="inline-flex w-fit items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.28em] text-amber-200">
                Backend test form
              </span>
              <div className="space-y-3">
                <h1 className="max-w-md text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                  Upload a CV and inspect the endpoint response.
                </h1>
                <p className="max-w-lg text-sm leading-7 text-slate-300 sm:text-base">
                  This is a minimal starting point for testing your backend. Pick a file, submit it,
                  and the returned payload will open in a modal so you can quickly inspect the result.
                </p>
              </div>
            </div>

            <dl className="grid gap-4 text-sm text-slate-300 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <dt className="text-xs uppercase tracking-[0.24em] text-slate-400">Method</dt>
                <dd className="mt-2 font-medium text-white">POST</dd>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <dt className="text-xs uppercase tracking-[0.24em] text-slate-400">Field</dt>
                <dd className="mt-2 font-medium text-white">file</dd>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <dt className="text-xs uppercase tracking-[0.24em] text-slate-400">Endpoint</dt>
                <dd className="mt-2 break-all font-medium text-white">{UPLOAD_ENDPOINT}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label
                  htmlFor={inputId}
                  className="block text-sm font-medium text-slate-700"
                >
                  File upload
                </label>
                <label
                  htmlFor={inputId}
                  className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center transition hover:border-amber-400 hover:bg-amber-50/60"
                >
                  <input
                    id={inputId}
                    className="sr-only"
                    type="file"
                    name="file"
                    accept=".pdf,.doc,.docx,.rtf,.txt"
                    onChange={(event) => {
                      const nextFile = event.target.files?.[0] ?? null;
                      setSelectedFile(nextFile);
                      setError(null);
                    }}
                  />
                  <div className="space-y-3">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
                      CV
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        Click to choose a file
                      </p>
                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        PDF, DOC, DOCX, RTF, or TXT
                      </p>
                    </div>
                    <p className="text-sm text-slate-600">
                      {selectedFile ? selectedFile.name : "No file selected yet"}
                    </p>
                  </div>
                </label>
              </div>

              {error ? (
                <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-slate-950 px-5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Submitting..." : "Submit CV"}
              </button>
            </form>
          </div>
        </section>
      </main>

      {result ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="response-title"
            className="w-full max-w-3xl overflow-hidden rounded-[1.75rem] bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">
                  Endpoint response
                </p>
                <h2 id="response-title" className="mt-1 text-2xl font-semibold text-slate-900">
                  {result.ok ? "Request succeeded" : "Request returned an error"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  HTTP {result.status}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setResult(null)}
                className="rounded-full border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              >
                Close
              </button>
            </div>

            <div className="max-h-[70vh] overflow-auto bg-slate-950 px-6 py-5 text-slate-100">
              <pre className="whitespace-pre-wrap break-words text-sm leading-6">
                {formatResponseBody(result.body)}
              </pre>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
