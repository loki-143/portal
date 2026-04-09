import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Upload, FileText, CheckCircle2, AlertCircle, X, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function BulkUpload() {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<{ name: string; size: string; status: 'uploading' | 'complete' | 'error' }[]>([]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    // Simulate file upload
    const newFiles = [
      { name: 'resume_john_doe.pdf', size: '1.2 MB', status: 'complete' as const },
      { name: 'jane_smith_cv.pdf', size: '850 KB', status: 'uploading' as const },
    ];
    setFiles([...files, ...newFiles]);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      <header className="space-y-2">
        <h1 className="display-lg">Bulk Upload</h1>
        <p className="text-lg text-on-surface-variant font-medium">Upload multiple resumes to the talent pool at once.</p>
      </header>

      <Card 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed transition-all duration-300 min-h-[400px] flex flex-col items-center justify-center text-center p-12
          ${isDragging ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-outline-variant/30 bg-surface-container-low'}
        `}
      >
        <div className="w-20 h-20 soul-gradient rounded-full flex items-center justify-center text-on-primary mb-8 shadow-xl shadow-primary/20">
          <Upload className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-black mb-4">Drag and drop resumes here</h2>
        <p className="text-on-surface-variant/60 max-w-md mx-auto mb-8 leading-relaxed">
          Support for PDF, DOCX, and TXT files. Our AI will automatically parse candidate details and assign match scores.
        </p>
        <div className="flex gap-4">
          <Button size="lg">Select Files</Button>
          <Button variant="secondary" size="lg">Import from LinkedIn</Button>
        </div>
      </Card>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="label-md text-on-surface-variant/50">Recent Uploads</h3>
          <button className="text-xs font-bold text-primary hover:underline">Clear All</button>
        </div>

        <div className="space-y-3">
          <AnimatePresence>
            {files.map((file, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <Card variant="lowest" className="p-4 flex items-center gap-4 shadow-sm group">
                  <div className="p-3 bg-surface-container-low rounded-lg text-on-surface-variant/40">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm">{file.name}</p>
                    <p className="text-[10px] label-md text-on-surface-variant/40">{file.size}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    {file.status === 'complete' ? (
                      <div className="flex items-center gap-2 text-green-600 text-xs font-bold">
                        <CheckCircle2 className="w-4 h-4" />
                        Parsed
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-primary text-xs font-bold">
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        Processing...
                      </div>
                    )}
                    <button className="p-2 text-on-surface-variant/20 hover:text-error transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {files.length === 0 && (
            <div className="text-center py-12 opacity-20">
              <FileText className="w-12 h-12 mx-auto mb-4" />
              <p className="font-medium">No files uploaded yet</p>
            </div>
          )}
        </div>
      </div>

      {files.length > 0 && (
        <div className="flex justify-end pt-8">
          <Button size="lg" className="group">
            Process Candidates
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      )}
    </div>
  );
}
