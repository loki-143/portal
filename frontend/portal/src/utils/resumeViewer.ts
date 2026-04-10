export function openResumeViewer(resumeData: any, matchData: any, app: any) {
  const normalized = resumeData.normalized_resume;
  const aiScore = app.ai_score || matchData?.jd_match_score;
  const breakdown = matchData?.breakdown;
  const matchedSkills = matchData?.matched_skills || [];
  const missingSkills = matchData?.missing_skills || [];
  const recommendation = matchData?.recommendation;
  const summary = matchData?.summary;
  
  const resumeHTML = `
    <html>
      <head>
        <title>Resume - ${normalized.full_name || 'Candidate'}</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            padding: 40px;
            max-width: 1000px;
            margin: 0 auto;
            line-height: 1.6;
            color: #333;
            background: #f8f9fa;
          }
          .container {
            background: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
          h1 { 
            color: #1a1a1a;
            border-bottom: 3px solid #007bff;
            padding-bottom: 15px;
            margin-bottom: 30px;
          }
          h2 { 
            color: #444;
            margin-top: 35px;
            margin-bottom: 15px;
            font-size: 1.3em;
            border-bottom: 1px solid #ddd;
            padding-bottom: 8px;
          }
          .ai-section {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 25px;
            border-radius: 12px;
            margin-bottom: 30px;
          }
          .ai-section h2 {
            color: white;
            border-bottom: 2px solid rgba(255,255,255,0.3);
            margin-top: 0;
          }
          .score-display {
            display: flex;
            align-items: center;
            gap: 20px;
            margin: 20px 0;
          }
          .score-circle {
            width: 120px;
            height: 120px;
            border-radius: 50%;
            background: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2.5em;
            font-weight: bold;
            color: ${aiScore >= 80 ? '#4caf50' : aiScore >= 60 ? '#ff9800' : '#f44336'};
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          }
          .score-details {
            flex: 1;
          }
          .breakdown {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 15px;
          }
          .breakdown-item {
            background: rgba(255,255,255,0.2);
            padding: 12px;
            border-radius: 8px;
          }
          .breakdown-item strong {
            display: block;
            font-size: 0.9em;
            margin-bottom: 5px;
          }
          .breakdown-item span {
            font-size: 1.5em;
            font-weight: bold;
          }
          .recommendation {
            display: inline-block;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: bold;
            margin-top: 10px;
            background: ${recommendation === 'SHORTLIST' ? '#4caf50' : recommendation === 'REVIEW' ? '#ff9800' : '#f44336'};
          }
          .skills-comparison {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-top: 15px;
          }
          .skills-box {
            background: rgba(255,255,255,0.1);
            padding: 15px;
            border-radius: 8px;
          }
          .skills-box h3 {
            margin-top: 0;
            font-size: 1em;
            margin-bottom: 10px;
          }
          .skill-item {
            display: inline-block;
            padding: 4px 10px;
            margin: 4px;
            border-radius: 12px;
            font-size: 0.85em;
            background: rgba(255,255,255,0.3);
          }
          .contact { 
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 25px;
          }
          .contact p { margin: 5px 0; }
          .skills { 
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 10px;
          }
          .skill-tag {
            background: #e3f2fd;
            color: #1976d2;
            padding: 6px 12px;
            border-radius: 16px;
            font-size: 0.9em;
            font-weight: 500;
          }
          .skill-tag.matched {
            background: #c8e6c9;
            color: #2e7d32;
          }
          .job, .edu {
            margin-bottom: 20px;
            padding-left: 15px;
            border-left: 3px solid #007bff;
          }
          .job-title, .edu-degree {
            font-weight: 600;
            color: #1a1a1a;
            font-size: 1.05em;
          }
          .company, .institution {
            color: #666;
            font-style: italic;
          }
          .dates {
            color: #888;
            font-size: 0.9em;
          }
          .score-badge {
            display: inline-block;
            background: ${resumeData.resume_quality?.score >= 80 ? '#4caf50' : resumeData.resume_quality?.score >= 60 ? '#ff9800' : '#f44336'};
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: bold;
            margin-top: 10px;
          }
          .print-btn {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 24px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: bold;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            z-index: 1000;
          }
          .print-btn:hover {
            background: #0056b3;
          }
          @media print {
            body { background: white; }
            .print-btn { display: none; }
          }
        </style>
      </head>
      <body>
        <button class="print-btn" onclick="window.print()">🖨️ Print Resume</button>
        <div class="container">
          ${aiScore ? `
            <div class="ai-section">
              <h2>🤖 AI Match Analysis for ${app.jobs?.title || 'This Position'}</h2>
              <div class="score-display">
                <div class="score-circle">${Math.round(aiScore)}%</div>
                <div class="score-details">
                  <h3 style="margin-top: 0;">Job Match Score</h3>
                  <p style="margin: 10px 0;">${summary || 'AI analysis of candidate fit for this position.'}</p>
                  ${recommendation ? `<span class="recommendation">${recommendation}</span>` : ''}
                </div>
              </div>
              
              ${breakdown ? `
                <div class="breakdown">
                  ${Object.entries(breakdown.jd_match || {}).map(([key, value]) => `
                    <div class="breakdown-item">
                      <strong>${key.replace(/_/g, ' ').toUpperCase()}</strong>
                      <span>${Math.round(value as number)}%</span>
                    </div>
                  `).join('')}
                </div>
              ` : ''}
              
              ${matchedSkills.length > 0 || missingSkills.length > 0 ? `
                <div class="skills-comparison">
                  ${matchedSkills.length > 0 ? `
                    <div class="skills-box">
                      <h3>✅ Matched Skills (${matchedSkills.length})</h3>
                      ${matchedSkills.map((skill: string) => `<span class="skill-item">${skill}</span>`).join('')}
                    </div>
                  ` : ''}
                  ${missingSkills.length > 0 ? `
                    <div class="skills-box">
                      <h3>⚠️ Missing Skills (${missingSkills.length})</h3>
                      ${missingSkills.map((skill: string) => `<span class="skill-item">${skill}</span>`).join('')}
                      <p style="margin-top: 10px; font-size: 0.85em; opacity: 0.9;">
                        <strong>Why score is lower:</strong> Candidate lacks these required skills. Consider training opportunities or assess if equivalent experience compensates.
                      </p>
                    </div>
                  ` : ''}
                </div>
              ` : ''}
            </div>
          ` : ''}
          
          <h1>${normalized.full_name || 'Candidate Resume'}</h1>
          
          <div class="contact">
            ${normalized.emails?.length ? `<p><strong>📧 Email:</strong> ${normalized.emails.join(', ')}</p>` : ''}
            ${normalized.phones?.length ? `<p><strong>📱 Phone:</strong> ${normalized.phones.join(', ')}</p>` : ''}
            ${normalized.current_location ? `<p><strong>📍 Location:</strong> ${normalized.current_location}</p>` : ''}
            ${normalized.current_role ? `<p><strong>💼 Current Role:</strong> ${normalized.current_role}</p>` : ''}
          </div>

          ${normalized.skills?.length ? `
            <h2>Skills</h2>
            <div class="skills">
              ${normalized.skills.map((skill: string) => {
                const isMatched = matchedSkills.includes(skill);
                return `<span class="skill-tag ${isMatched ? 'matched' : ''}">${skill}${isMatched ? ' ✓' : ''}</span>`;
              }).join('')}
            </div>
          ` : ''}

          ${normalized.employment_history?.length ? `
            <h2>Work Experience</h2>
            ${normalized.employment_history.map((job: any) => `
              <div class="job">
                <div class="job-title">${job.title || 'Position'}</div>
                <div class="company">${job.company || 'Company'}</div>
                <div class="dates">${job.start_date || ''} - ${job.is_current ? 'Present' : job.end_date || ''}</div>
                ${job.description ? `<p style="margin-top: 8px;">${job.description}</p>` : ''}
              </div>
            `).join('')}
          ` : ''}

          ${normalized.education?.length ? `
            <h2>Education</h2>
            ${normalized.education.map((edu: any) => `
              <div class="edu">
                <div class="edu-degree">${edu.degree || ''} ${edu.specialization || ''}</div>
                <div class="institution">${edu.institution || ''}</div>
                <div class="dates">${edu.completion_year || ''}</div>
              </div>
            `).join('')}
          ` : ''}

          ${resumeData.resume_quality?.score ? `
            <h2>Resume Quality</h2>
            <span class="score-badge">Score: ${resumeData.resume_quality.score}/100</span>
            ${resumeData.resume_quality.summary ? `<p style="margin-top: 15px;">${resumeData.resume_quality.summary}</p>` : ''}
          ` : ''}
        </div>
      </body>
    </html>
  `;
  
  const newWindow = window.open('', '_blank');
  if (newWindow) {
    newWindow.document.write(resumeHTML);
    newWindow.document.close();
  } else {
    alert('Please allow pop-ups to view the resume.');
  }
}
