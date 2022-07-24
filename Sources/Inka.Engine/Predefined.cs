// MIT License
//
// Copyright (c) 2022 Serhii Kokhan
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

namespace Inka.Engine;

public static class Predefined
{
    public const string ApplicationName = "Inka";

    public static class Directory
    {
        public const string WwwRoot = "wwwroot";
        public const string Input = "input";
        public const string Output = "output";
        public const string TemporaryDirectoryPrefix = "inka_temp_dir_";
    }

    public static class File
    {
        public const string Layout = "_Layout.cshtml";
    }

    public static class PipeConfiguration
    {
        public const string CopyFromDisk = "inka.system.copy-from-disk";
        public const string CopyFromContext = "inka.system.copy-from-context";
        public const string CopyToDisk = "inka.system.copy-to-disk";
        public const string PreventReadContent = "inka.system.prevent-read-content";
    }

    public static class Extension
    {
        public const string Html = ".html";
        public const string CSharpHtml = ".cshtml";
        public const string Markdown = ".md";
        public const string Css = ".css";
    }

    public static class Nav
    {
        public const string AllSubRoutesPattern = "*";
    }
}