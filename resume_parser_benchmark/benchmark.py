"""Main benchmark script comparing pypdf vs LiteParse."""

import os
import time
import pandas as pd
import matplotlib.pyplot as plt
from pathlib import Path
from typing import Dict, List, Any

# Import parsers
try:
    from pypdf import PdfReader
    PYPDF_AVAILABLE = True
except ImportError:
    PYPDF_AVAILABLE = False
    print("Warning: pypdf not installed")

try:
    from liteparse import parse_pdf
    LITEPARSE_AVAILABLE = True
except ImportError:
    LITEPARSE_AVAILABLE = False
    print("Warning: liteparse not installed")

from utils import (
    calculate_text_metrics,
    detect_multi_column,
    format_time,
    format_number
)


class BenchmarkRunner:
    """Run benchmarks on PDF parsers."""
    
    def __init__(self, sample_dir: str = "sample_resumes", results_dir: str = "results"):
        self.sample_dir = Path(sample_dir)
        self.results_dir = Path(results_dir)
        self.results_dir.mkdir(exist_ok=True)
        self.results: List[Dict[str, Any]] = []
    
    def test_pypdf(self, pdf_path: Path) -> Dict[str, Any]:
        """Test pypdf extraction."""
        result = {
            'parser': 'pypdf',
            'file': pdf_path.name,
            'success': False,
            'time': 0,
            'error': None
        }
        
        if not PYPDF_AVAILABLE:
            result['error'] = "pypdf not installed"
            return result
        
        try:
            start_time = time.time()
            reader = PdfReader(str(pdf_path))
            text = ""
            for page in reader.pages:
                text += page.extract_text()
            end_time = time.time()
            
            result['success'] = True
            result['time'] = end_time - start_time
            result['text'] = text
            result.update(calculate_text_metrics(text))
            result['multi_column_detected'] = detect_multi_column(text)
            result['ocr_used'] = False
            
        except Exception as e:
            result['error'] = str(e)
        
        return result
    
    def test_liteparse(self, pdf_path: Path) -> Dict[str, Any]:
        """Test LiteParse extraction with OCR."""
        result = {
            'parser': 'liteparse',
            'file': pdf_path.name,
            'success': False,
            'time': 0,
            'error': None
        }
        
        if not LITEPARSE_AVAILABLE:
            result['error'] = "liteparse not installed"
            return result
        
        try:
            start_time = time.time()
            # LiteParse with OCR enabled
            parsed = parse_pdf(str(pdf_path), use_ocr=True)
            text = parsed.get('text', '') if isinstance(parsed, dict) else str(parsed)
            end_time = time.time()
            
            result['success'] = True
            result['time'] = end_time - start_time
            result['text'] = text
            result.update(calculate_text_metrics(text))
            result['multi_column_detected'] = detect_multi_column(text)
            result['ocr_used'] = True
            
        except Exception as e:
            result['error'] = str(e)
        
        return result
    
    def run_benchmarks(self):
        """Run all benchmarks."""
        pdf_files = list(self.sample_dir.glob("*.pdf"))
        
        if not pdf_files:
            print(f"No PDF files found in {self.sample_dir}/")
            print("Please add sample resumes to the sample_resumes/ folder")
            return
        
        print(f"Found {len(pdf_files)} PDF files to test\n")
        
        for pdf_file in pdf_files:
            print(f"Testing: {pdf_file.name}")
            
            # Test pypdf
            if PYPDF_AVAILABLE:
                print("  - Running pypdf...")
                result = self.test_pypdf(pdf_file)
                self.results.append(result)
                if result['success']:
                    print(f"    ✓ Success ({format_time(result['time'])})")
                else:
                    print(f"    ✗ Failed: {result['error']}")
            
            # Test LiteParse
            if LITEPARSE_AVAILABLE:
                print("  - Running liteparse...")
                result = self.test_liteparse(pdf_file)
                self.results.append(result)
                if result['success']:
                    print(f"    ✓ Success ({format_time(result['time'])})")
                else:
                    print(f"    ✗ Failed: {result['error']}")
            
            print()
    
    def save_results(self):
        """Save results to CSV and generate summary."""
        if not self.results:
            print("No results to save")
            return
        
        # Create DataFrame
        df = pd.DataFrame(self.results)
        
        # Save detailed CSV
        csv_path = self.results_dir / "comparison.csv"
        # Remove 'text' column for CSV (too large)
        df_export = df.drop(columns=['text'], errors='ignore')
        df_export.to_csv(csv_path, index=False)
        print(f"Saved detailed results to {csv_path}")
        
        # Generate summary
        self.generate_summary(df)
        
        # Generate charts
        self.generate_charts(df)
    
    def generate_summary(self, df: pd.DataFrame):
        """Generate human-readable summary."""
        summary_path = self.results_dir / "summary.txt"
        
        with open(summary_path, 'w') as f:
            f.write("=" * 60 + "\n")
            f.write("RESUME PARSER BENCHMARK SUMMARY\n")
            f.write("=" * 60 + "\n\n")
            
            for parser in df['parser'].unique():
                parser_df = df[df['parser'] == parser]
                successful = parser_df[parser_df['success'] == True]
                
                f.write(f"{parser.upper()}\n")
                f.write("-" * 40 + "\n")
                f.write(f"Files tested: {len(parser_df)}\n")
                f.write(f"Successful: {len(successful)}\n")
                f.write(f"Failed: {len(parser_df) - len(successful)}\n")
                f.write(f"Success rate: {len(successful)/len(parser_df)*100:.1f}%\n")
                
                if len(successful) > 0:
                    f.write(f"\nAverage extraction time: {format_time(successful['time'].mean())}\n")
                    f.write(f"Average characters: {format_number(int(successful['char_count'].mean()))}\n")
                    f.write(f"Average words: {format_number(int(successful['word_count'].mean()))}\n")
                    f.write(f"Average lines: {format_number(int(successful['line_count'].mean()))}\n")
                    
                    if 'ocr_used' in successful.columns:
                        ocr_count = successful['ocr_used'].sum()
                        f.write(f"OCR enabled: {'Yes' if ocr_count > 0 else 'No'}\n")
                    
                    multi_col = successful['multi_column_detected'].sum()
                    f.write(f"Multi-column detected: {multi_col}/{len(successful)} files\n")
                
                f.write("\n")
            
            # Comparison
            if len(df['parser'].unique()) > 1:
                f.write("=" * 60 + "\n")
                f.write("COMPARISON\n")
                f.write("=" * 60 + "\n\n")
                
                for file in df['file'].unique():
                    file_df = df[df['file'] == file]
                    f.write(f"{file}:\n")
                    for _, row in file_df.iterrows():
                        if row['success']:
                            f.write(f"  {row['parser']}: {format_time(row['time'])}, "
                                  f"{format_number(row['char_count'])} chars\n")
                        else:
                            f.write(f"  {row['parser']}: FAILED - {row['error']}\n")
                    f.write("\n")
        
        print(f"Saved summary to {summary_path}")
        
        # Print summary to console
        with open(summary_path, 'r') as f:
            print("\n" + f.read())
    
    def generate_charts(self, df: pd.DataFrame):
        """Generate visual comparison charts."""
        successful_df = df[df['success'] == True]
        
        if len(successful_df) == 0:
            print("No successful results to chart")
            return
        
        fig, axes = plt.subplots(2, 2, figsize=(14, 10))
        fig.suptitle('Resume Parser Benchmark Comparison', fontsize=16, fontweight='bold')
        
        # Chart 1: Average extraction time
        ax1 = axes[0, 0]
        time_data = successful_df.groupby('parser')['time'].mean()
        time_data.plot(kind='bar', ax=ax1, color=['#3498db', '#e74c3c'])
        ax1.set_title('Average Extraction Time')
        ax1.set_ylabel('Time (seconds)')
        ax1.set_xlabel('Parser')
        ax1.tick_params(axis='x', rotation=0)
        
        # Chart 2: Average character count
        ax2 = axes[0, 1]
        char_data = successful_df.groupby('parser')['char_count'].mean()
        char_data.plot(kind='bar', ax=ax2, color=['#3498db', '#e74c3c'])
        ax2.set_title('Average Characters Extracted')
        ax2.set_ylabel('Characters')
        ax2.set_xlabel('Parser')
        ax2.tick_params(axis='x', rotation=0)
        
        # Chart 3: Success rate
        ax3 = axes[1, 0]
        success_data = df.groupby('parser')['success'].apply(lambda x: (x.sum() / len(x)) * 100)
        success_data.plot(kind='bar', ax=ax3, color=['#3498db', '#e74c3c'])
        ax3.set_title('Success Rate')
        ax3.set_ylabel('Success Rate (%)')
        ax3.set_xlabel('Parser')
        ax3.set_ylim([0, 105])
        ax3.tick_params(axis='x', rotation=0)
        
        # Chart 4: Multi-column detection
        ax4 = axes[1, 1]
        multi_col_data = successful_df.groupby('parser')['multi_column_detected'].sum()
        multi_col_data.plot(kind='bar', ax=ax4, color=['#3498db', '#e74c3c'])
        ax4.set_title('Multi-Column Layouts Detected')
        ax4.set_ylabel('Count')
        ax4.set_xlabel('Parser')
        ax4.tick_params(axis='x', rotation=0)
        
        plt.tight_layout()
        
        chart_path = self.results_dir / "charts.png"
        plt.savefig(chart_path, dpi=300, bbox_inches='tight')
        print(f"Saved charts to {chart_path}")
        plt.close()


def main():
    """Main entry point."""
    print("Resume Parser Benchmark")
    print("=" * 60)
    print()
    
    # Check dependencies
    if not PYPDF_AVAILABLE and not LITEPARSE_AVAILABLE:
        print("ERROR: No parsers available. Please install dependencies:")
        print("  pip install -r requirements.txt")
        return
    
    # Create sample directory if it doesn't exist
    sample_dir = Path("sample_resumes")
    sample_dir.mkdir(exist_ok=True)
    
    # Run benchmark
    runner = BenchmarkRunner()
    runner.run_benchmarks()
    runner.save_results()
    
    print("\nBenchmark complete!")


if __name__ == "__main__":
    main()
