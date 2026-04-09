
# Real-World Resume vs JD Test Report

Generated: 2026-04-08

## Executive Summary

- Real resumes tested: 5
- Parse successes: 5/5
- Scanned-resume rejections: 0 in this batch
- Best matches for `Python Full-Stack Developer (Fresher Role)`: `Tarak_Tarun116.pdf` (87), `Full_Formatted_Document.pdf` (83), `A22126511005_BankuruGanesh.pdf` (80)
- Best match for `Senior Software Engineer`: `Full_Formatted_Document.pdf` (66), but this file appears to be an abnormal long-form technical/system-analysis PDF rather than a normal resume, so treat that score as a stress-test result rather than a trustworthy hiring signal
- Lowest-quality parse: `resume_v1.1.pdf` with missing `full_name` and `emails`, showing the parser still struggles on some compact single-page resume layouts

## Important Observations

- `Full_Formatted_Document.pdf` is a useful robustness test, but its 74-page length and extracted certification count of `1156` indicate it should not be treated as a normal resume benchmark
- Fresher-aligned resumes scored much more realistically against the fresher Python full-stack JD than against the senior Cotiviti JD, which is the expected scoring behavior
- Two-column resumes parsed successfully in this batch, but some location extraction is still weak or missing for real Indian resume headers
- The report should be read as a true end-to-end parser/scorer validation run, not as model-quality proof for every resume layout

## Job Descriptions Used

### Senior Software Engineer
- Job ID: `jd_cotiviti_senior_software_engineer`
- Required skills: C#, .NET Core, React, SQL, Azure, CI/CD
- Preferred skills: Retail analytics, System design, Mentoring, Cloud services

### Python Full-Stack Developer (Fresher Role)
- Job ID: `jd_python_full_stack_fresher`
- Required skills: Python, Flask, HTML, CSS, JavaScript, Git
- Preferred skills: PostgreSQL, MySQL, APIs, OOP, DSA

## Resume Results

### A22126511005_BankuruGanesh.pdf
- Resume ID: `real_world_001_a22126511005_bankuruganesh`
- Parse status: `200`
- Name: Bankuru Ganesh
- Role: Motivated Information Technology Undergraduate
- Location: None
- Quality score: 94
- Skills: AWS, Arduino, Azure, C, CSS, Docker, Flask, Git, HTML, IoT, Java, JavaScript, Oracle, PostgreSQL, Python, Raspberry Pi, SQL
- Projects parsed: 7
- Certifications parsed: 6
- Extractor: pypdf
- Pages: 2
- Scanned detected: False
- Parse warnings: Two-column layout detected; section ordering was normalized before extraction.
- Missing fields: current_location
  - JD `jd_cotiviti_senior_software_engineer`: jd_match=23, resume_quality=94, recommendation=REVIEW
    matched: Azure, SQL
    missing: .NET Core, C#, CI/CD, React
  - JD `jd_python_full_stack_fresher`: jd_match=80, resume_quality=94, recommendation=SHORTLIST
    matched: CSS, Flask, Git, HTML, JavaScript, Python
    missing: None

### Full_Formatted_Document.pdf
- Resume ID: `real_world_002_full_formatted_document`
- Parse status: `200`
- Name: Complete System Analysis (formatted)
- Role: "Senior Software Engineer
- Location: str
- Quality score: 100
- Skills: AWS, Algorithms, Android, Angular, Arduino, Azure, Bootstrap, C, C#, C++, CI/CD, CSS, Data Structures, Deep Learning, Django, Docker, Excel, FastAPI, Flask, Flutter, GCP, Git, GitHub Actions, GraphQL, HTML, IoT, Java, JavaScript, Jenkins, Kubernetes, Linux, Machine Learning, MongoDB, MySQL, NLP, Node.js, NumPy, Oracle, Pandas, PostgreSQL, Python, REST APIs, Raspberry Pi, React, Redis, SQL, Spring, Spring Boot, Tailwind CSS, Terraform, TypeScript, Vue.js
- Projects parsed: 1
- Certifications parsed: 1156
- Extractor: pypdf
- Pages: 74
- Scanned detected: False
- Parse warnings: Sensitive personal identifiers were detected and excluded from the normalized profile.
  - JD `jd_cotiviti_senior_software_engineer`: jd_match=66, resume_quality=100, recommendation=REVIEW
    matched: Azure, C#, CI/CD, React, SQL
    missing: .NET Core
  - JD `jd_python_full_stack_fresher`: jd_match=83, resume_quality=100, recommendation=SHORTLIST
    matched: CSS, Flask, Git, HTML, JavaScript, Python
    missing: None

### resume_v1.1.pdf
- Resume ID: `real_world_003_resume_v1_1`
- Parse status: `200`
- Name: None
- Role: I Am Information Technology Student
- Location: Lokesh Vasu Dev Chilla Visakhapatnam, Andhra Pradesh Mail/Lokesh
- Quality score: 58
- Skills: C#, CSS, FastAPI, Git, HTML, IoT, Java, JavaScript, MongoDB, Node.js, Python, REST APIs, React, SQL, Spring Boot
- Projects parsed: 0
- Certifications parsed: 0
- Extractor: pypdf
- Pages: 1
- Scanned detected: False
- Parse warnings: Sensitive personal identifiers were detected and excluded from the normalized profile.
- Missing fields: full_name, emails
  - JD `jd_cotiviti_senior_software_engineer`: jd_match=24, resume_quality=58, recommendation=REJECT
    matched: C#, React, SQL
    missing: .NET Core, Azure, CI/CD
  - JD `jd_python_full_stack_fresher`: jd_match=60, resume_quality=58, recommendation=REVIEW
    matched: CSS, Git, HTML, JavaScript, Python
    missing: Flask

### s raj resume.pdf
- Resume ID: `real_world_004_s_raj_resume`
- Parse status: `200`
- Name: Vajrapu Shalem Raj
- Role: I worked as an intern
- Location: None
- Quality score: 78
- Skills: C, CSS, Data Structures, HTML, JavaScript, Python, SQL
- Projects parsed: 5
- Certifications parsed: 0
- Extractor: pypdf
- Pages: 1
- Scanned detected: False
- Parse warnings: Two-column layout detected; section ordering was normalized before extraction.
- Missing fields: current_location
  - JD `jd_cotiviti_senior_software_engineer`: jd_match=15, resume_quality=78, recommendation=REVIEW
    matched: SQL
    missing: .NET Core, Azure, C#, CI/CD, React
  - JD `jd_python_full_stack_fresher`: jd_match=66, resume_quality=78, recommendation=REVIEW
    matched: CSS, HTML, JavaScript, Python
    missing: Flask, Git

### Tarak_Tarun116.pdf
- Resume ID: `real_world_005_tarak_tarun116`
- Parse status: `200`
- Name: Puligopu Tarak Tarun
- Role: developer.
- Location: Srikakulam, Andhra Pradesh, India
- Quality score: 98
- Skills: C++, CSS, Data Structures, Flask, Git, HTML, Java, JavaScript, Machine Learning, MySQL, PostgreSQL, Python, SQL, Spring Boot
- Projects parsed: 11
- Certifications parsed: 5
- Extractor: pypdf
- Pages: 1
- Scanned detected: False
- Parse warnings: Two-column layout detected; section ordering was normalized before extraction.
  - JD `jd_cotiviti_senior_software_engineer`: jd_match=14, resume_quality=98, recommendation=REVIEW
    matched: SQL
    missing: .NET Core, Azure, C#, CI/CD, React
  - JD `jd_python_full_stack_fresher`: jd_match=87, resume_quality=98, recommendation=SHORTLIST
    matched: CSS, Flask, Git, HTML, JavaScript, Python
    missing: None
