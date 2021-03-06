﻿class DataSource {
	public static APIURL: string;
	public username: string;
	public password: string;
	public enrolledSections: Array<SectionExpanded>;
	
	constructor() {

	}

	/**
	 * Authenticate to myPurdue and set credentials for future requests
	 * @return Promise, resolved with boolean T success. Rejected on request failure.
	 */
	public authenticate(username: string, password: string): Promise<string> {
		return new Promise<string>((resolve: (result: string) => void, reject: () => void) => {
			JsonRequest.httpGet<string>(DataSource.APIURL + '/Student/Authenticate', username, password).then((success) => {
				this.username = username;
				this.password = password;
				resolve("Authenticated");
			}, (error) => {
				reject();
			});
		});
	}

	/**
	 * Fetches the sections a user is registered for, organized by term.
	 * @return An object containing arrays of SectionDetail objects, keyed by term name.
	 */
	public fetchUserSchedule(): Promise<Array<SectionExpanded>> {
		return new Promise<Array<SectionExpanded>>((resolve: (result) => void, reject: () => void) => {
			JsonRequest.httpGet<{ [termName: string]: string[]; }>(DataSource.APIURL + "/Student/Schedule", this.username, this.password).then((success) => {
				var guidList = "";
				for (var term in success) {
					var sectionGuids: string[] = success[term];
					if (guidList.length > 0) {
						guidList += "%20or%20";
					}
					for (var i = 0; i < sectionGuids.length; i++) {
						if (i > 0) {
							guidList += "%20or%20";
						}
						guidList += "SectionId%20eq%20" + sectionGuids[i];
					}
				}
				JsonRequest.httpGet<Array<SectionExpanded>>(DataSource.APIURL + "/odata/Sections?$expand=Class($expand=Course($expand=Subject),Term),Meetings&$filter=" + guidList).then((success) => {
					this.enrolledSections = success;
					resolve(success);
				}, (error) => {
					reject();
				});
			}, (error) => {
				reject();
			});
		});
	}

	/**
	 * Fetches an array of terms ordered reverse-chronologically
	 * @return Promise, resolved with Term Array or rejected on request failure
	 */
	public fetchTerms(): Promise<Array<Term>> {
		return JsonRequest.httpGet<Array<Term>>(DataSource.APIURL + "/odata/Terms?$orderby=StartDate%20desc");
	}

	/**
	 * Fetches an array of subjects ordered by abbreviation in the given term
	 * @return Promise, resolved with Subject Array or rejected on failure
	 */
	public fetchTermSubjects(term: Term): Promise<Array<Subject>> {
		return JsonRequest.httpGet<Array<Subject>>(DataSource.APIURL + "/odata/Subjects/?$filter=(Courses/any(c:%20c/Classes/any(cc:%20cc/Term/TermId%20eq%20" + term.TermId + ")))&$orderby=Abbreviation%20asc");
	}

	/**
	 * Fetches a count of subjects that have classes listed in the given term
	 * @return Promise, resolved with number or rejected on request failure
	 */
	public fetchTermSubjectCount(term: Term): Promise<number> {
		return JsonRequest.httpGet<number>(DataSource.APIURL + "/odata/Subjects/$count/?$filter=(Courses/any(c:%20c/Classes/any(cc:%20cc/Term/TermId%20eq%20" + term.TermId + ")))");
	}

	/**
	 * Fetches a count of courses that have classes listed in the given term
	 * @return Promise, resolved with number or rejected on request failure
	 */
	public fetchTermCourseCount(term: Term): Promise<number> {
		return JsonRequest.httpGet<number>(DataSource.APIURL + "/odata/Courses/$count/?$filter=(Classes/any(c:%20c/Term/TermId%20eq%20" + term.TermId + "))");
	}

	/**
	 * Fetches a count of sections that belong to classes listed in the given term
	 * @return Promise, resolved with number or rejected on request failure
	 */
	public fetchTermSectionCount(term: Term): Promise<number> {
		return JsonRequest.httpGet<number>(DataSource.APIURL + "/odata/Sections/$count/?$filter=(Class/Term/TermId%20eq%20" + term.TermId + ")");
	}

	/**
	 * Fetches a count of full sections that belong to classes listed in the given term
	 * @return Promise, resolved with number or rejected on request failure
	 */
	public fetchTermFilledSectionCount(term: Term): Promise<number> {
		return JsonRequest.httpGet<number>(DataSource.APIURL + "/odata/Sections/$count/?$filter=((Class/Term/TermId%20eq%20" + term.TermId + ")%20and%20(RemainingSpace%20eq%200))");
	}

	/**
	 * Fetches a count of courses in a particular subject and term
	 * @return Promise, resolved with number or rejected on request failure
	 */
	public fetchTermSubjectCoursesCount(term: Term, subject: Subject): Promise<number> {
		return JsonRequest.httpGet<number>(DataSource.APIURL + "/odata/Courses/$count/?$filter=(Classes/any(c:%20c/Term/TermId%20eq%20" + term.TermId + "))%20and%20Subject/SubjectId%20eq%20" + subject.SubjectId);
	}

	/**
	 * Fetches an array of courses in a particular subject and term
	 * @return Promise, resolved with array of Courses or rejected on request failure
	 */
	public fetchTermSubjectCourses(term: Term, subject: Subject): Promise<Array<Course>> {
		return JsonRequest.httpGet<Array<Course>>(DataSource.APIURL + "/odata/Courses/?$filter=(Classes/any(c:%20c/Term/TermId%20eq%20" + term.TermId + "))%20and%20Subject/SubjectId%20eq%20" + subject.SubjectId + "&$orderby=Number%20asc");
	}

	/**
	 * Fetches a count of instructors in a particular subject and term
	 * @return Promise, resolved with number or rejected on request failure
	 */
	public fetchTermSubjectInstructorsCount(term: Term, subject: Subject): Promise<number> {
		return JsonRequest.httpGet<number>(DataSource.APIURL + "/odata/Instructors/$count/?$filter=(Meetings/any(m:%20m/Section/Class/Course/Subject/SubjectId%20eq%20" + subject.SubjectId + "%20and%20m/Section/Class/Term/TermId%20eq%20" + term.TermId + "))");
	}

	/**
	 * Fetches details on a particular course (all navigational properties expanded)
	 * @return Promise, resolved with CourseDetails or rejected on request failure
	 */
	public fetchTermCourseDetails(term: Term, course: Course): Promise<CourseDetails> {
		return new Promise<CourseDetails>((resolve: (result) => void, reject: () => void) => {
			JsonRequest.httpGet<CourseDetails>(DataSource.APIURL + "/odata/Courses(" + course.CourseId + ")?$expand=Subject").then((result) => {
				JsonRequest.httpGet<Array<ClassDetails>>(DataSource.APIURL + "/odata/Classes?$filter=Course/CourseId%20eq%20" + course.CourseId + "%20and%20Term/TermId%20eq%20" + term.TermId + "&$expand=Term,Sections($expand=Meetings($expand=Instructors,Room($expand=Building)))").then((classResult) => {
					result.Classes = classResult;
					resolve(result);
				}, () => {
					reject();
				});
			}, () => {
				reject();
			});
		});
	}
}

// Defining a default API url here - this can be overridden by Debug.ts
DataSource.APIURL = "//api.purdue.io";