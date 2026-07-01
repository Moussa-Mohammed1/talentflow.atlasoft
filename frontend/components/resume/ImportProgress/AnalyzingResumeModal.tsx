import { Loader2 } from 'lucide-react';
import React from 'react';

const skillSkeletonWidths = [84, 102, 72, 96, 118, 88, 108];

export default function AnalyzingResumeModal({ isOpen = true }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300">
      <div className="w-full max-w-xl bg-white border border-gray-200 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        
    
        <div className="flex items-center p-6 border-b border-gray-100 space-x-4 [scrollbar-width:none]">
          <div className="relative flex items-center justify-center w-10 h-10 bg-blue-50 rounded-full">
            <Loader2 className="animate-spin"/>
          </div>
          <div>
            <h2 className="text-lg text-left font-bold text-gray-900">
              Analyzing Resume
            </h2>
            <p className="text-sm font-medium text-gray-600">
              Extracting structured data from your document...
            </p>
          </div>
        </div>

        <div className="p-6 overflow-y-auto space-y-8 [scrollbar-width:none]">
          
         
          <div className="space-y-3">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <h3 className="text-sm font-semibold text-gray-800">Experiences</h3>
            </div>
            <div className="animate-pulse space-y-4 pl-4 border-l-2 border-gray-100">
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="h-3 bg-gray-100 rounded w-1/4"></div>
                <div className="space-y-1 pt-2">
                  <div className="h-2 bg-gray-100 rounded w-full"></div>
                  <div className="h-2 bg-gray-100 rounded w-5/6"></div>
                </div>
              </div>
            </div>
          </div>
 
          <div className="space-y-3">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
              <h3 className="text-sm font-semibold text-gray-800">Education</h3>
            </div>
            <div className="animate-pulse pl-4 space-y-2 border-l-2 border-gray-100">
              <div className="h-4 bg-gray-200 rounded w-2/5"></div>
              <div className="h-3 bg-gray-100 rounded w-1/3"></div>
            </div>
          </div>

           <div className="space-y-3">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
              <h3 className="text-sm font-semibold text-gray-800">Skills</h3>
            </div>
            <div className="flex flex-wrap gap-2 pl-4">
              {skillSkeletonWidths.map((width) => (
                <div 
                  key={width}
                  className="h-8 bg-gray-200 rounded-full animate-pulse"
                  style={{ width: `${width}px` }}
                ></div>
              ))}
            </div>
          </div>

           <div className="space-y-3">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <h3 className="text-sm font-semibold text-gray-800">Certifications</h3>
            </div>
            <div className="animate-pulse pl-4 space-y-3 border-l-2 border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-200 rounded-md"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-2 bg-gray-100 rounded w-1/4"></div>
                </div>
              </div>
            </div>
          </div>

           <div className="space-y-3">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
              <h3 className="text-sm font-semibold text-gray-800">Languages</h3>
            </div>
            <div className="animate-pulse pl-4 flex space-x-6">
              <div className="space-y-2 w-24">
                <div className="h-3 bg-gray-200 rounded w-full"></div>
                <div className="h-2 bg-gray-100 rounded w-2/3"></div>
              </div>
              <div className="space-y-2 w-24">
                <div className="h-3 bg-gray-200 rounded w-full"></div>
                <div className="h-2 bg-gray-100 rounded w-1/2"></div>
              </div>
            </div>
          </div>

        </div>
        
         <div className="p-4 bg-gray-50 border-t border-gray-100 rounded-b-2xl">
          <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
            <div className="bg-blue-600 h-1.5 rounded-full animate-[progress_2s_ease-in-out_infinite]"></div>
          </div>
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes progress {
              0% { width: 0%; transform: translateX(-100%); }
              50% { width: 50%; }
              100% { width: 100%; transform: translateX(100%); }
            }
          `}} />
        </div>

      </div>
    </div>
  );
}
